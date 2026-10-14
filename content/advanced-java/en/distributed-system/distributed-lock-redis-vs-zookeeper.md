---
source:
  locale: zh
  slug: distributed-lock-redis-vs-zookeeper
  hash: 'sha256:v1:f8f366102d50f199a6ab7c2517236af455132bdf606196116a81ab8a9f945258'
status: machine
translatedAt: '2026-10-14'
---
# Redis vs Zookeeper for Distributed Locks

## Interview Question

What are the common ways to implement a distributed lock? How do you design a distributed lock with Redis? Can you design one with ZooKeeper (zk)? Which of the two implementations is more efficient?

## Interviewer Psychology

This is how such questions are usually asked: the interviewer first asks about zk, and then moves on to zk-related questions such as distributed locks. In distributed system development, distributed locks are a very common scenario.

## Answer Analysis

### Redis Distributed Lock

The official name is the `RedLock` algorithm, the distributed lock algorithm officially supported by Redis.

This distributed lock has three important considerations:

-   Mutual exclusion (only one client can hold the lock)
-   No deadlock
-   Fault tolerance (the lock is valid as long as most Redis nodes have created it)

#### The Simplest Redis Distributed Lock

The simplest implementation is to create a key in Redis with `SET key value [EX seconds] [PX milliseconds] NX`; that counts as acquiring the lock. Where:

-   `NX`: the set succeeds only if the `key` does not exist. If the `key` already exists in Redis, the set fails and returns `nil`.
-   `EX seconds`: sets the expiration time of the `key`, accurate to the second. It means the lock is released automatically after `seconds` seconds; if someone else finds the key already exists when trying to create it, they cannot acquire the lock.
-   `PX milliseconds`: also sets the expiration time of the `key`, accurate to the millisecond.

For example, run the following command:

```r
SET resource_name my_random_value PX 30000 NX
```

Releasing the lock means deleting the key, but it is usually done with a `lua` script that deletes only if the value matches:

```lua
-- When deleting the lock, find the value for the key and compare it with the value you passed in; delete only if they match.
if redis.call("get",KEYS[1]) == ARGV[1] then
    return redis.call("del",KEYS[1])
else
    return 0
end
```

Why use a `random_value`? Suppose a client acquires the lock but is blocked for a long time before it finishes, say more than 30s. By then the lock may already have been released automatically, and another client may have acquired it. If you simply delete the key at that point, you cause a problem, so you need the random value plus the `lua` script above to release the lock.

But this is definitely not enough. With a plain single Redis instance, it is a single point of failure. With a plain Redis master/replica setup, replication is asynchronous: if the master goes down (and the key is gone) before the key has been synchronized to the replica, the replica is promoted to master and someone else can set the key and obtain the lock.

#### RedLock Algorithm

Assume a Redis cluster with 5 Redis master instances. The steps to acquire a lock are:

1. Get the current timestamp in milliseconds;
2. As above, try to create the lock on each master node in turn, with a short timeout, usually a few dozen milliseconds (the timeout a client uses to acquire the lock must be much smaller than the total auto-release time. For example, if the auto-release time is 10 seconds, the timeout might be in the range of `5~50` milliseconds);
3. Try to create the lock on **most of the nodes**; with 5 nodes, that means 3 nodes, that is `n / 2 + 1`;
4. The client calculates how long it took to create the lock. If that time is less than the timeout, the lock is considered created;
5. If creating the lock failed, delete the locks that were created, one by one;
6. As long as someone else holds a distributed lock, you have to **keep polling to try to acquire the lock**.

![redis-redlock](asset:distributed-system/distributed-lock-redis-vs-zookeeper/redis-redlock.png)

[Redis official](https://redis.io/) gives the two Redis-based distributed lock methods above. For details, see https://redis.io/topics/distlock .

### zk Distributed Lock

A zk distributed lock can be quite simple: a node tries to create an ephemeral znode. If the creation succeeds, it has acquired the lock. Other clients that try to create the lock fail and can only **register a listener** on the lock. Releasing the lock means deleting the znode; once it is released, the clients are notified, and one waiting client can try to acquire the lock again.

```java
/**
 * ZooKeeperSession
 */
public class ZooKeeperSession {

    private static CountDownLatch connectedSemaphore = new CountDownLatch(1);

    private ZooKeeper zookeeper;
    private CountDownLatch latch;

    public ZooKeeperSession() {
        try {
            this.zookeeper = new ZooKeeper("192.168.31.187:2181,192.168.31.19:2181,192.168.31.227:2181", 50000, new ZooKeeperWatcher());
            try {
                connectedSemaphore.await();
            } catch (InterruptedException e) {
                e.printStackTrace();
            }

            System.out.println("ZooKeeper session established......");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Acquire the distributed lock
     *
     * @param productId
     */
    public Boolean acquireDistributedLock(Long productId) {
        String path = "/product-lock-" + productId;

        try {
            zookeeper.create(path, "".getBytes(), Ids.OPEN_ACL_UNSAFE, CreateMode.EPHEMERAL);
            return true;
        } catch (Exception e) {
            while (true) {
                try {
                    // Equivalent to registering a listener on the node, to check whether it exists
                    Stat stat = zk.exists(path, true);

                    if (stat != null) {
                        this.latch = new CountDownLatch(1);
                        this.latch.await(waitTime, TimeUnit.MILLISECONDS);
                        this.latch = null;
                    }
                    zookeeper.create(path, "".getBytes(), Ids.OPEN_ACL_UNSAFE, CreateMode.EPHEMERAL);
                    return true;
                } catch (Exception ee) {
                    continue;
                }
            }

        }
        return true;
    }

    /**
     * Release a distributed lock
     *
     * @param productId
     */
    public void releaseDistributedLock(Long productId) {
        String path = "/product-lock-" + productId;
        try {
            zookeeper.delete(path, -1);
            System.out.println("release the lock for product[id=" + productId + "]......");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Watcher for establishing the zk session
     */
    private class ZooKeeperWatcher implements Watcher {

        public void process(WatchedEvent event) {
            System.out.println("Receive watched event: " + event.getState());

            if (KeeperState.SyncConnected == event.getState()) {
                connectedSemaphore.countDown();
            }

            if (this.latch != null) {
                this.latch.countDown();
            }
        }

    }

    /**
     * Static inner class that wraps the singleton
     */
    private static class Singleton {

        private static ZooKeeperSession instance;

        static {
            instance = new ZooKeeperSession();
        }

        public static ZooKeeperSession getInstance() {
            return instance;
        }

    }

    /**
     * Get the singleton
     *
     * @return
     */
    public static ZooKeeperSession getInstance() {
        return Singleton.getInstance();
    }

    /**
     * Convenience method to initialize the singleton
     */
    public static void init() {
        getInstance();
    }

}
```

Another approach is to create ephemeral sequential nodes:

If many clients compete for one lock, they queue up. The first one to get the lock executes and then releases it; each of the following clients listens on the node created by the client **right before it**. Once a client releases the lock, the client behind it is notified by ZooKeeper; once notified, it is fine, it has acquired the lock and can run its code.

```java
public class ZooKeeperDistributedLock implements Watcher {

    private ZooKeeper zk;
    private String locksRoot = "/locks";
    private String productId;
    private String waitNode;
    private String lockNode;
    private CountDownLatch latch;
    private CountDownLatch connectedLatch = new CountDownLatch(1);
    private int sessionTimeout = 30000;

    public ZooKeeperDistributedLock(String productId) {
        this.productId = productId;
        try {
            String address = "192.168.31.187:2181,192.168.31.19:2181,192.168.31.227:2181";
            zk = new ZooKeeper(address, sessionTimeout, this);
            connectedLatch.await();
        } catch (IOException e) {
            throw new LockException(e);
        } catch (KeeperException e) {
            throw new LockException(e);
        } catch (InterruptedException e) {
            throw new LockException(e);
        }
    }

    public void process(WatchedEvent event) {
        if (event.getState() == KeeperState.SyncConnected) {
            connectedLatch.countDown();
            return;
        }

        if (this.latch != null) {
            this.latch.countDown();
        }
    }

    public void acquireDistributedLock() {
        try {
            if (this.tryLock()) {
                return;
            } else {
                waitForLock(waitNode, sessionTimeout);
            }
        } catch (KeeperException e) {
            throw new LockException(e);
        } catch (InterruptedException e) {
            throw new LockException(e);
        }
    }

    public boolean tryLock() {
        try {
            // The locksRoot + "/" + productId passed in
            // Suppose productId represents a product id, for example 1
            // locksRoot = locks
            // /locks/10000000000，/locks/10000000001，/locks/10000000002
            lockNode = zk.create(locksRoot + "/" + productId, new byte[0], ZooDefs.Ids.OPEN_ACL_UNSAFE, CreateMode.EPHEMERAL_SEQUENTIAL);

            // Check whether the newly created node is the smallest node
            // locks：10000000000，10000000001，10000000002
            List<String> locks = zk.getChildren(locksRoot, false);
            Collections.sort(locks);

            if (lockNode.equals(locksRoot + "/" + locks.get(0))) {
                // If it is the smallest node, the lock is acquired
                return true;
            }

            // If it is not the smallest node, find the node one smaller than itself
            int previousLockIndex = -1;
            for (int i = 0; i < locks.size(); i++) {
                if (lockNode.equals(locksRoot + "/" +locks.get(i))){
                    previousLockIndex = i - 1;
                    break;
                }
            }

            this.waitNode = locks.get(previousLockIndex);
        } catch (KeeperException e) {
            throw new LockException(e);
        } catch (InterruptedException e) {
            throw new LockException(e);
        }
        return false;
    }

    private boolean waitForLock(String waitNode, long waitTime) throws InterruptedException, KeeperException {
        Stat stat = zk.exists(locksRoot + "/" + waitNode, true);
        if (stat != null) {
            this.latch = new CountDownLatch(1);
            this.latch.await(waitTime, TimeUnit.MILLISECONDS);
            this.latch = null;
        }
        return true;
    }

    public void unlock() {
        try {
            // Delete the /locks/10000000000 node
            // Delete the /locks/10000000001 node
            System.out.println("unlock " + lockNode);
            zk.delete(lockNode, -1);
            lockNode = null;
            zk.close();
        } catch (InterruptedException e) {
            e.printStackTrace();
        } catch (KeeperException e) {
            e.printStackTrace();
        }
    }

    public class LockException extends RuntimeException {
        private static final long serialVersionUID = 1L;

        public LockException(String e) {
            super(e);
        }

        public LockException(Exception e) {
            super(e);
        }
    }
}
```

However, using zk ephemeral nodes has another problem. zk keeps a client alive through periodic session heartbeats. If the client goes into a long GC pause, zk may conclude that the client has crashed and release the lock, letting other clients acquire it. After the GC pause ends, the client still believes it holds the lock, so several clients may hold the lock at the same time. [#209](https://github.com/doocs/advanced-java/issues/209)

In this case, you can use JVM tuning to avoid long GC pauses as much as possible.

### Redis Distributed Lock vs zk Distributed Lock

-   With a Redis distributed lock, **you have to keep trying to acquire the lock yourself**, which costs performance.
-   With a zk distributed lock, if you cannot get the lock, you just register a listener and do not need to keep actively trying, so the performance overhead is small.

Another point: if the client holding a Redis lock hits a bug and goes down, the lock can only be released after the timeout. With zk, because the znode created is ephemeral, as soon as the client goes down the znode disappears and the lock is released automatically.

Doesn't the Redis distributed lock seem troublesome? Looping to acquire it, calculating time, and so on... The semantics of a zk distributed lock are clear and the implementation is simple.

So without analyzing too much, just on these two points, in my own practice a zk distributed lock is more reliable than a Redis distributed lock, and its model is simple and easy to use.
