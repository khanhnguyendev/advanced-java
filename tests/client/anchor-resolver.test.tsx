// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnchorResolver } from '@/components/AnchorResolver';

describe('AnchorResolver', () => {
  beforeEach(() => {
    document.body.innerHTML = '<h2 id="h2-giới-thiệu" data-hi="2">T</h2>';
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it('does not rewrite the URL when the encoded hash equals the id', () => {
    window.location.hash = '#' + encodeURIComponent('h2-giới-thiệu');
    const spy = vi.spyOn(window.history, 'replaceState');
    render(<AnchorResolver />);
    expect(spy).not.toHaveBeenCalled();
  });

  it('rewrites a stale slug to the encoded real id, keeping history state', () => {
    window.location.hash = '#h2-old';
    const spy = vi.spyOn(window.history, 'replaceState');
    render(<AnchorResolver />);
    expect(spy).toHaveBeenCalledWith(window.history.state, '', '#' + encodeURIComponent('h2-giới-thiệu'));
  });
});
