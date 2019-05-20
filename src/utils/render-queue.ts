

export const renderQueue = (function (fn: any) {
    let _queue: any[] = [];
    let _rate: number = 100;
    let _invalidate = function () { };
    let _clear = function () { };
    let _callback = function () { };

    let rq: any = function (data: any[], callback: any) {
        if (data != null) rq.data(data);
        if (callback != null) _callback = callback;
        _invalidate();
        _clear();
        rq.render();
    };

    rq.render = function () {
        let valid: boolean = true;
        _invalidate = rq.invalidate = function () { valid = false };
        function doFrame() {
            if (valid === false) return;
            let chunk = _queue.splice(0, _rate);
            if (chunk.length === 0) {
                _callback();
                return;
            }
            chunk.map(fn);
            window.requestAnimationFrame(doFrame);
        }
        doFrame();
    }

    rq.data = function (data: any[]) {
        _invalidate();
        _queue = data.slice(0);
    }

    rq.add = function (data: any[]) {
        _queue = _queue.concat(data);
    }

    rq.rate = function (value: number) {
        if (!arguments.length) return _rate;
        _rate = value;
        return rq;
    }

    rq.remaining = function () {
        return _queue.length;
    }

    rq.clear = function (_clearFn: any) {
        if (!arguments.length) {
            _clear();
            return rq;
        }
        _clear = _clearFn;
        return rq;
    }

    rq.invalidate = _invalidate;

    return rq;
});