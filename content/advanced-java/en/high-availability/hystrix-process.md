---
source:
  locale: zh
  slug: hystrix-process
  hash: 'sha256:v1:1a09a0d5375edeb278fb7f7a2573623a6e374d103efab79be5d5490ece5cf1db'
status: machine
translatedAt: '2026-10-14'
---
# Inside the Hystrix Execution Process

Earlier we covered the most basic techniques Hystrix uses to support high availability: **resource isolation** + **rate limiting**.

-   Create a command;
-   Execute the command;
-   Configure the group and thread pool for the command.

Here we explain what the underlying execution flow, steps and principles of Hystrix are once you start executing the command by calling its execute() method.

While walking through this flow, I will also bring up some other core and important Hystrix features.

Here is the flow chart of the whole 8-step process; I will explain each step in detail. Following along with this chart as you learn should make the line of thought clearer.

![hystrix-process](asset:high-availability/hystrix-process/new-hystrix-process.jpg)

## Step 1: create the command

A HystrixCommand or HystrixObservableCommand object represents one request or call to a dependency service. When creating it, you can pass any required parameters to the constructor.

-   HystrixCommand is mainly used for calls that return only a single result.
-   HystrixObservableCommand is mainly used for calls that may return multiple results.

```java
// Create a HystrixCommand
HystrixCommand hystrixCommand = new HystrixCommand(arg1, arg2);

// Create a HystrixObservableCommand
HystrixObservableCommand hystrixObservableCommand = new HystrixObservableCommand(arg1, arg2);
```

## Step 2: call a command execution method

Executing the command issues one call to the dependency service.

To execute a command, you can choose one of 4 methods: execute(), queue(), observe() and toObservable().

Of these, execute() and queue() apply only to HystrixCommand.

-   execute(): blocks directly after the call; it is a synchronous call that returns until the dependency service returns a single result or throws an exception.
-   queue(): returns a Future; it is an asynchronous call, and the single result can be obtained from the Future later.
-   observe(): subscribes to an Observable object, which represents the result returned by the dependency service, and obtains a copy of that Observable.
-   toObservable(): returns an Observable object; if we subscribe to it, the command is executed and the result is obtained.

```java
K             value    = hystrixCommand.execute();
Future<K>     fValue   = hystrixCommand.queue();
Observable<K> oValue   = hystrixObservableCommand.observe();
Observable<K> toOValue = hystrixObservableCommand.toObservable();
```

execute() actually calls queue().get(), as you can see in the Hystrix source code.

```java
public R execute() {
    try {
        return queue().get();
    } catch (Exception e) {
        throw Exceptions.sneakyThrow(decomposeException(e));
    }
}
```

And in the queue() method, toObservable().toBlocking().toFuture() is called.

```java
final Future<R> delegate = toObservable().toBlocking().toFuture();
```

That is, a Future object is first obtained through toObservable(), and then the Future's get() method is called. So no matter how the command is executed, it ultimately relies on toObservable() to execute.

## Step 3: check whether the cache is enabled (rarely used)

From this step on we enter the underlying runtime principles of Hystrix and look at some of its more advanced features.

If the command has the request cache (Request Cache) enabled and the result of this call exists in the cache, the result is returned directly from the cache. Otherwise, continue with the following steps.

## Step 4: check whether the circuit breaker is open

Check whether the circuit breaker is enabled for the dependency service this command corresponds to. If the circuit breaker is open, Hystrix will not execute the command but will go straight to the degradation (fallback) mechanism and return the degraded result.

## Step 5: check whether the thread pool/queue/semaphore is full

If the command's thread pool and queue are full, or its semaphore is full, the command is not executed either; the degradation mechanism is invoked directly, and a reject event is sent to the circuit breaker's statistics.

## Step 6: execute the command

The construct() method of the HystrixObservableCommand object, or the run() method of the HystrixCommand, is called to actually execute the command.

-   HystrixCommand.run() returns a single result or throws an exception.

```java
// Execute through the command to get the latest single product record
ProductInfo productInfo = getProductInfoCommand.execute();
```

-   HystrixObservableCommand.construct() returns an Observable object from which multiple results can be obtained.

```java
Observable<ProductInfo> observable = getProductInfosCommand.observe();

// Subscribe to get multiple results
observable.subscribe(new Observer<ProductInfo>() {
    @Override
    public void onCompleted() {
        System.out.println("获取完了所有的商品数据");
    }

    @Override
    public void onError(Throwable e) {
        e.printStackTrace();
    }

    /**
     * This method is called back once for each item fetched
     *
     * @param productInfo product information
     */
    @Override
    public void onNext(ProductInfo productInfo) {
        System.out.println(productInfo);
    }
});
```

With the thread pool approach, if the execution time of HystrixCommand.run() or HystrixObservableCommand.construct() exceeds the timeout, the thread the command runs in throws a TimeoutException, and the degradation mechanism is executed, ignoring whatever run() or construct() returns. In another case, if the command fails and throws some other exception, it also goes to degradation. In both cases, Hystrix sends the exception event to the circuit breaker's statistics.

**Note** that we cannot terminate the thread of a dependency service that is severely delayed; it can only throw a TimeoutException at you.

If there is no timeout and execution is normal, the calling thread gets the result obtained from the dependency service, and Hystrix also does some logging and metric statistics.

## Step 7: circuit health check

Hystrix sends every success, failure, reject and timeout event of calls to a dependency service to the circuit breaker. The circuit breaker counts these events and, based on the ratio of abnormal events, decides whether to break the circuit (circuit breaking). If the circuit breaker is open, then for the following period of time it breaks the circuit directly and returns the degraded result.

If, afterwards, the circuit breaker tries to execute the command and the call succeeds with a normal result, Hystrix closes the circuit breaker.

## Step 8: Invoke the degradation mechanism

Hystrix invokes the degradation mechanism in the following situations.

-   The circuit breaker is open;
-   The thread pool/queue/semaphore is full;
-   The command execution times out;
-   run() or construct() throws an exception.

In the degradation mechanism, it is generally recommended to provide some default return values, such as static code logic or data fetched from an in-memory cache, and to avoid making network requests here.

If a network call is absolutely necessary in degradation, that call should also be wrapped in a HystrixCommand for isolation.

-   In a HystrixCommand, implement the getFallback() method to provide the degradation mechanism.
-   In a HystrixObservableCommand, implement the resumeWithFallback() method, which returns an Observable object, to provide the degraded result.

If no fallback is implemented, or the fallback throws an exception, Hystrix returns an Observable but it does not return any data.

Different ways of executing a command return different results when the fallback is empty or throws an exception.

-   For execute(), the exception is thrown directly.
-   For queue(), a Future is returned, and the exception is thrown when get() is called.
-   For observe(), an Observable object is returned, but when subscribe() is called to subscribe to it, the caller's onError() method is invoked immediately.
-   For toObservable(), an Observable object is returned, but when subscribe() is called to subscribe to it, the caller's onError() method is invoked immediately.

## Different ways of execution

-   execute(): obtains a Future.get() and then gets the single result.
-   queue(): returns a Future.
-   observe(): subscribes to the Observable immediately, then starts the 8 execution steps, and returns a copied Observable; the result is called back to you immediately on subscription.
-   toObservable(): returns the original Observable, which must be subscribed to manually before the 8 steps are executed.
