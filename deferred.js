// Generated by CoffeeScript 1.6.3
(function() {
  var Deferred, IDENTIFIER, PENDING, REJECTED, RESOLVED, VERSION, after, execute, flatten, has, installInto, isArguments, wrap, _when,
    __slice = [].slice;

  VERSION = '2.0.0';

  IDENTIFIER = "SD-" + VERSION;

  PENDING = "pending";

  RESOLVED = "resolved";

  REJECTED = "rejected";

  has = function(obj, prop) {
    return obj != null ? obj.hasOwnProperty(prop) : void 0;
  };

  isArguments = function(obj) {
    return has(obj, 'length') && has(obj, 'callee');
  };

  flatten = function(array) {
    if (isArguments(array)) {
      return flatten(Array.prototype.slice.call(array));
    }
    if (!Array.isArray(array)) {
      return [array];
    }
    return array.reduce(function(memo, value) {
      if (Array.isArray(value)) {
        return memo.concat(flatten(value));
      }
      memo.push(value);
      return memo;
    }, []);
  };

  after = function(times, func) {
    if (times <= 0) {
      return func();
    }
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  wrap = function(func, wrapper) {
    return function() {
      var args;
      args = [func].concat(Array.prototype.slice.call(arguments, 0));
      return wrapper.apply(this, args);
    };
  };

  execute = function(callbacks, args, context) {
    var callback, _i, _len, _ref, _results;
    _ref = flatten(callbacks);
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      callback = _ref[_i];
      _results.push(callback.call.apply(callback, [context].concat(__slice.call(args))));
    }
    return _results;
  };

  Deferred = function() {
    var close, closingArguments, doneCallbacks, failCallbacks, state;
    this.isPromise = function() {
      return true;
    };
    state = PENDING;
    doneCallbacks = [];
    failCallbacks = [];
    closingArguments = {};
    this.promise = function(candidate) {
      var pipe, storeCallbacks;
      candidate = candidate || {};
      candidate.state = function() {
        return state;
      };
      storeCallbacks = function(shouldExecuteImmediately, holder) {
        return function() {
          if (state === PENDING) {
            holder.push.apply(holder, flatten(arguments));
          }
          if (shouldExecuteImmediately()) {
            execute(arguments, closingArguments);
          }
          return candidate;
        };
      };
      candidate.done = storeCallbacks((function() {
        return state === RESOLVED;
      }), doneCallbacks);
      candidate.fail = storeCallbacks((function() {
        return state === REJECTED;
      }), failCallbacks);
      candidate.always = function() {
        var _ref;
        return (_ref = candidate.done.apply(candidate, arguments)).fail.apply(_ref, arguments);
      };
      pipe = function(doneFilter, failFilter) {
        var deferred, filter;
        deferred = new Deferred();
        filter = function(source, destination, filter) {
          if (filter) {
            return candidate[source](function() {
              var args, filteredArgs;
              args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
              filteredArgs = filter.apply(null, args);
              if (has(filteredArgs, 'isPromise') && filteredArgs.isPromise()) {
                return filteredArgs[source](function() {
                  var args;
                  args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
                  return destination.apply(null, args);
                });
              } else {
                return destination(filteredArgs);
              }
            });
          } else {
            return candidate[source](function() {
              var args;
              args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
              return destination.apply(null, args);
            });
          }
        };
        filter('done', deferred.resolve, doneFilter);
        filter('fail', deferred.reject, failFilter);
        return deferred;
      };
      candidate.pipe = pipe;
      candidate.then = pipe;
      return candidate;
    };
    this.promise(this);
    close = function(finalState, callbacks, context) {
      return function() {
        if (state === PENDING) {
          state = finalState;
          closingArguments = arguments;
          execute(callbacks, closingArguments, context);
        }
        return this;
      };
    };
    this.resolve = close(RESOLVED, doneCallbacks);
    this.reject = close(REJECTED, failCallbacks);
    this.resolveWith = function() {
      var args, context;
      context = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return close(RESOLVED, doneCallbacks, context).apply(null, args);
    };
    this.rejectWith = function() {
      var args, context;
      context = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return close(REJECTED, failCallbacks, context).apply(null, args);
    };
    return this;
  };

  _when = function() {
    var def, defs, finish, resolutionArgs, trigger, _i, _len;
    trigger = new Deferred();
    defs = flatten(arguments);
    if (defs.length === 1) {
      defs[0].done(function() {
        return trigger.resolve.apply(trigger, arguments);
      });
    } else {
      resolutionArgs = [];
      finish = after(defs.length, function() {
        return trigger.resolve.apply(trigger, resolutionArgs);
      });
      defs.forEach(function(def, index) {
        return def.done(function() {
          var args;
          args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          resolutionArgs[index] = args;
          return finish();
        });
      });
    }
    for (_i = 0, _len = defs.length; _i < _len; _i++) {
      def = defs[_i];
      def.fail(trigger.reject);
    }
    return trigger.promise();
  };

  installInto = function(fw) {
    fw.Deferred = function() {
      return new Deferred();
    };
    fw.ajax = wrap(fw.ajax, function(ajax, options) {
      var createWrapper, def, promise, xhr;
      if (options == null) {
        options = {};
      }
      def = new Deferred();
      createWrapper = function(wrapped, finisher) {
        return wrap(wrapped, function() {
          var args, func;
          func = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
          if (func) {
            func.apply(null, args);
          }
          return finisher.apply(null, args);
        });
      };
      options.success = createWrapper(options.success, def.resolve);
      options.error = createWrapper(options.error, def.reject);
      xhr = ajax(options);
      promise = def.promise();
      promise.abort = function() {
        return xhr.abort();
      };
      return promise;
    });
    return fw.when = _when;
  };

  if (typeof exports !== 'undefined') {
    exports.Deferred = function() {
      return new Deferred();
    };
    exports.when = _when;
    exports.installInto = installInto;
  } else {
    this.Deferred = function() {
      return new Deferred();
    };
    this.Deferred.when = _when;
    this.Deferred.installInto = installInto;
  }

}).call(this);
