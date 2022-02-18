
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35730/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init$1(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.4' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    var page = createCommonjsModule(function (module, exports) {
    (function (global, factory) {
    	module.exports = factory() ;
    }(commonjsGlobal, (function () {
    var isarray = Array.isArray || function (arr) {
      return Object.prototype.toString.call(arr) == '[object Array]';
    };

    /**
     * Expose `pathToRegexp`.
     */
    var pathToRegexp_1 = pathToRegexp;
    var parse_1 = parse;
    var compile_1 = compile;
    var tokensToFunction_1 = tokensToFunction;
    var tokensToRegExp_1 = tokensToRegExp;

    /**
     * The main path matching regexp utility.
     *
     * @type {RegExp}
     */
    var PATH_REGEXP = new RegExp([
      // Match escaped characters that would otherwise appear in future matches.
      // This allows the user to escape special characters that won't transform.
      '(\\\\.)',
      // Match Express-style parameters and un-named parameters with a prefix
      // and optional suffixes. Matches appear as:
      //
      // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?", undefined]
      // "/route(\\d+)"  => [undefined, undefined, undefined, "\d+", undefined, undefined]
      // "/*"            => ["/", undefined, undefined, undefined, undefined, "*"]
      '([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^()])+)\\))?|\\(((?:\\\\.|[^()])+)\\))([+*?])?|(\\*))'
    ].join('|'), 'g');

    /**
     * Parse a string for the raw tokens.
     *
     * @param  {String} str
     * @return {Array}
     */
    function parse (str) {
      var tokens = [];
      var key = 0;
      var index = 0;
      var path = '';
      var res;

      while ((res = PATH_REGEXP.exec(str)) != null) {
        var m = res[0];
        var escaped = res[1];
        var offset = res.index;
        path += str.slice(index, offset);
        index = offset + m.length;

        // Ignore already escaped sequences.
        if (escaped) {
          path += escaped[1];
          continue
        }

        // Push the current path onto the tokens.
        if (path) {
          tokens.push(path);
          path = '';
        }

        var prefix = res[2];
        var name = res[3];
        var capture = res[4];
        var group = res[5];
        var suffix = res[6];
        var asterisk = res[7];

        var repeat = suffix === '+' || suffix === '*';
        var optional = suffix === '?' || suffix === '*';
        var delimiter = prefix || '/';
        var pattern = capture || group || (asterisk ? '.*' : '[^' + delimiter + ']+?');

        tokens.push({
          name: name || key++,
          prefix: prefix || '',
          delimiter: delimiter,
          optional: optional,
          repeat: repeat,
          pattern: escapeGroup(pattern)
        });
      }

      // Match any characters still remaining.
      if (index < str.length) {
        path += str.substr(index);
      }

      // If the path exists, push it onto the end.
      if (path) {
        tokens.push(path);
      }

      return tokens
    }

    /**
     * Compile a string to a template function for the path.
     *
     * @param  {String}   str
     * @return {Function}
     */
    function compile (str) {
      return tokensToFunction(parse(str))
    }

    /**
     * Expose a method for transforming tokens into the path function.
     */
    function tokensToFunction (tokens) {
      // Compile all the tokens into regexps.
      var matches = new Array(tokens.length);

      // Compile all the patterns before compilation.
      for (var i = 0; i < tokens.length; i++) {
        if (typeof tokens[i] === 'object') {
          matches[i] = new RegExp('^' + tokens[i].pattern + '$');
        }
      }

      return function (obj) {
        var path = '';
        var data = obj || {};

        for (var i = 0; i < tokens.length; i++) {
          var token = tokens[i];

          if (typeof token === 'string') {
            path += token;

            continue
          }

          var value = data[token.name];
          var segment;

          if (value == null) {
            if (token.optional) {
              continue
            } else {
              throw new TypeError('Expected "' + token.name + '" to be defined')
            }
          }

          if (isarray(value)) {
            if (!token.repeat) {
              throw new TypeError('Expected "' + token.name + '" to not repeat, but received "' + value + '"')
            }

            if (value.length === 0) {
              if (token.optional) {
                continue
              } else {
                throw new TypeError('Expected "' + token.name + '" to not be empty')
              }
            }

            for (var j = 0; j < value.length; j++) {
              segment = encodeURIComponent(value[j]);

              if (!matches[i].test(segment)) {
                throw new TypeError('Expected all "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
              }

              path += (j === 0 ? token.prefix : token.delimiter) + segment;
            }

            continue
          }

          segment = encodeURIComponent(value);

          if (!matches[i].test(segment)) {
            throw new TypeError('Expected "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
          }

          path += token.prefix + segment;
        }

        return path
      }
    }

    /**
     * Escape a regular expression string.
     *
     * @param  {String} str
     * @return {String}
     */
    function escapeString (str) {
      return str.replace(/([.+*?=^!:${}()[\]|\/])/g, '\\$1')
    }

    /**
     * Escape the capturing group by escaping special characters and meaning.
     *
     * @param  {String} group
     * @return {String}
     */
    function escapeGroup (group) {
      return group.replace(/([=!:$\/()])/g, '\\$1')
    }

    /**
     * Attach the keys as a property of the regexp.
     *
     * @param  {RegExp} re
     * @param  {Array}  keys
     * @return {RegExp}
     */
    function attachKeys (re, keys) {
      re.keys = keys;
      return re
    }

    /**
     * Get the flags for a regexp from the options.
     *
     * @param  {Object} options
     * @return {String}
     */
    function flags (options) {
      return options.sensitive ? '' : 'i'
    }

    /**
     * Pull out keys from a regexp.
     *
     * @param  {RegExp} path
     * @param  {Array}  keys
     * @return {RegExp}
     */
    function regexpToRegexp (path, keys) {
      // Use a negative lookahead to match only capturing groups.
      var groups = path.source.match(/\((?!\?)/g);

      if (groups) {
        for (var i = 0; i < groups.length; i++) {
          keys.push({
            name: i,
            prefix: null,
            delimiter: null,
            optional: false,
            repeat: false,
            pattern: null
          });
        }
      }

      return attachKeys(path, keys)
    }

    /**
     * Transform an array into a regexp.
     *
     * @param  {Array}  path
     * @param  {Array}  keys
     * @param  {Object} options
     * @return {RegExp}
     */
    function arrayToRegexp (path, keys, options) {
      var parts = [];

      for (var i = 0; i < path.length; i++) {
        parts.push(pathToRegexp(path[i], keys, options).source);
      }

      var regexp = new RegExp('(?:' + parts.join('|') + ')', flags(options));

      return attachKeys(regexp, keys)
    }

    /**
     * Create a path regexp from string input.
     *
     * @param  {String} path
     * @param  {Array}  keys
     * @param  {Object} options
     * @return {RegExp}
     */
    function stringToRegexp (path, keys, options) {
      var tokens = parse(path);
      var re = tokensToRegExp(tokens, options);

      // Attach keys back to the regexp.
      for (var i = 0; i < tokens.length; i++) {
        if (typeof tokens[i] !== 'string') {
          keys.push(tokens[i]);
        }
      }

      return attachKeys(re, keys)
    }

    /**
     * Expose a function for taking tokens and returning a RegExp.
     *
     * @param  {Array}  tokens
     * @param  {Array}  keys
     * @param  {Object} options
     * @return {RegExp}
     */
    function tokensToRegExp (tokens, options) {
      options = options || {};

      var strict = options.strict;
      var end = options.end !== false;
      var route = '';
      var lastToken = tokens[tokens.length - 1];
      var endsWithSlash = typeof lastToken === 'string' && /\/$/.test(lastToken);

      // Iterate over the tokens and create our regexp string.
      for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];

        if (typeof token === 'string') {
          route += escapeString(token);
        } else {
          var prefix = escapeString(token.prefix);
          var capture = token.pattern;

          if (token.repeat) {
            capture += '(?:' + prefix + capture + ')*';
          }

          if (token.optional) {
            if (prefix) {
              capture = '(?:' + prefix + '(' + capture + '))?';
            } else {
              capture = '(' + capture + ')?';
            }
          } else {
            capture = prefix + '(' + capture + ')';
          }

          route += capture;
        }
      }

      // In non-strict mode we allow a slash at the end of match. If the path to
      // match already ends with a slash, we remove it for consistency. The slash
      // is valid at the end of a path match, not in the middle. This is important
      // in non-ending mode, where "/test/" shouldn't match "/test//route".
      if (!strict) {
        route = (endsWithSlash ? route.slice(0, -2) : route) + '(?:\\/(?=$))?';
      }

      if (end) {
        route += '$';
      } else {
        // In non-ending mode, we need the capturing groups to match as much as
        // possible by using a positive lookahead to the end or next path segment.
        route += strict && endsWithSlash ? '' : '(?=\\/|$)';
      }

      return new RegExp('^' + route, flags(options))
    }

    /**
     * Normalize the given path string, returning a regular expression.
     *
     * An empty array can be passed in for the keys, which will hold the
     * placeholder key descriptions. For example, using `/user/:id`, `keys` will
     * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
     *
     * @param  {(String|RegExp|Array)} path
     * @param  {Array}                 [keys]
     * @param  {Object}                [options]
     * @return {RegExp}
     */
    function pathToRegexp (path, keys, options) {
      keys = keys || [];

      if (!isarray(keys)) {
        options = keys;
        keys = [];
      } else if (!options) {
        options = {};
      }

      if (path instanceof RegExp) {
        return regexpToRegexp(path, keys)
      }

      if (isarray(path)) {
        return arrayToRegexp(path, keys, options)
      }

      return stringToRegexp(path, keys, options)
    }

    pathToRegexp_1.parse = parse_1;
    pathToRegexp_1.compile = compile_1;
    pathToRegexp_1.tokensToFunction = tokensToFunction_1;
    pathToRegexp_1.tokensToRegExp = tokensToRegExp_1;

    /**
       * Module dependencies.
       */

      

      /**
       * Short-cuts for global-object checks
       */

      var hasDocument = ('undefined' !== typeof document);
      var hasWindow = ('undefined' !== typeof window);
      var hasHistory = ('undefined' !== typeof history);
      var hasProcess = typeof process !== 'undefined';

      /**
       * Detect click event
       */
      var clickEvent = hasDocument && document.ontouchstart ? 'touchstart' : 'click';

      /**
       * To work properly with the URL
       * history.location generated polyfill in https://github.com/devote/HTML5-History-API
       */

      var isLocation = hasWindow && !!(window.history.location || window.location);

      /**
       * The page instance
       * @api private
       */
      function Page() {
        // public things
        this.callbacks = [];
        this.exits = [];
        this.current = '';
        this.len = 0;

        // private things
        this._decodeURLComponents = true;
        this._base = '';
        this._strict = false;
        this._running = false;
        this._hashbang = false;

        // bound functions
        this.clickHandler = this.clickHandler.bind(this);
        this._onpopstate = this._onpopstate.bind(this);
      }

      /**
       * Configure the instance of page. This can be called multiple times.
       *
       * @param {Object} options
       * @api public
       */

      Page.prototype.configure = function(options) {
        var opts = options || {};

        this._window = opts.window || (hasWindow && window);
        this._decodeURLComponents = opts.decodeURLComponents !== false;
        this._popstate = opts.popstate !== false && hasWindow;
        this._click = opts.click !== false && hasDocument;
        this._hashbang = !!opts.hashbang;

        var _window = this._window;
        if(this._popstate) {
          _window.addEventListener('popstate', this._onpopstate, false);
        } else if(hasWindow) {
          _window.removeEventListener('popstate', this._onpopstate, false);
        }

        if (this._click) {
          _window.document.addEventListener(clickEvent, this.clickHandler, false);
        } else if(hasDocument) {
          _window.document.removeEventListener(clickEvent, this.clickHandler, false);
        }

        if(this._hashbang && hasWindow && !hasHistory) {
          _window.addEventListener('hashchange', this._onpopstate, false);
        } else if(hasWindow) {
          _window.removeEventListener('hashchange', this._onpopstate, false);
        }
      };

      /**
       * Get or set basepath to `path`.
       *
       * @param {string} path
       * @api public
       */

      Page.prototype.base = function(path) {
        if (0 === arguments.length) return this._base;
        this._base = path;
      };

      /**
       * Gets the `base`, which depends on whether we are using History or
       * hashbang routing.

       * @api private
       */
      Page.prototype._getBase = function() {
        var base = this._base;
        if(!!base) return base;
        var loc = hasWindow && this._window && this._window.location;

        if(hasWindow && this._hashbang && loc && loc.protocol === 'file:') {
          base = loc.pathname;
        }

        return base;
      };

      /**
       * Get or set strict path matching to `enable`
       *
       * @param {boolean} enable
       * @api public
       */

      Page.prototype.strict = function(enable) {
        if (0 === arguments.length) return this._strict;
        this._strict = enable;
      };


      /**
       * Bind with the given `options`.
       *
       * Options:
       *
       *    - `click` bind to click events [true]
       *    - `popstate` bind to popstate [true]
       *    - `dispatch` perform initial dispatch [true]
       *
       * @param {Object} options
       * @api public
       */

      Page.prototype.start = function(options) {
        var opts = options || {};
        this.configure(opts);

        if (false === opts.dispatch) return;
        this._running = true;

        var url;
        if(isLocation) {
          var window = this._window;
          var loc = window.location;

          if(this._hashbang && ~loc.hash.indexOf('#!')) {
            url = loc.hash.substr(2) + loc.search;
          } else if (this._hashbang) {
            url = loc.search + loc.hash;
          } else {
            url = loc.pathname + loc.search + loc.hash;
          }
        }

        this.replace(url, null, true, opts.dispatch);
      };

      /**
       * Unbind click and popstate event handlers.
       *
       * @api public
       */

      Page.prototype.stop = function() {
        if (!this._running) return;
        this.current = '';
        this.len = 0;
        this._running = false;

        var window = this._window;
        this._click && window.document.removeEventListener(clickEvent, this.clickHandler, false);
        hasWindow && window.removeEventListener('popstate', this._onpopstate, false);
        hasWindow && window.removeEventListener('hashchange', this._onpopstate, false);
      };

      /**
       * Show `path` with optional `state` object.
       *
       * @param {string} path
       * @param {Object=} state
       * @param {boolean=} dispatch
       * @param {boolean=} push
       * @return {!Context}
       * @api public
       */

      Page.prototype.show = function(path, state, dispatch, push) {
        var ctx = new Context(path, state, this),
          prev = this.prevContext;
        this.prevContext = ctx;
        this.current = ctx.path;
        if (false !== dispatch) this.dispatch(ctx, prev);
        if (false !== ctx.handled && false !== push) ctx.pushState();
        return ctx;
      };

      /**
       * Goes back in the history
       * Back should always let the current route push state and then go back.
       *
       * @param {string} path - fallback path to go back if no more history exists, if undefined defaults to page.base
       * @param {Object=} state
       * @api public
       */

      Page.prototype.back = function(path, state) {
        var page = this;
        if (this.len > 0) {
          var window = this._window;
          // this may need more testing to see if all browsers
          // wait for the next tick to go back in history
          hasHistory && window.history.back();
          this.len--;
        } else if (path) {
          setTimeout(function() {
            page.show(path, state);
          });
        } else {
          setTimeout(function() {
            page.show(page._getBase(), state);
          });
        }
      };

      /**
       * Register route to redirect from one path to other
       * or just redirect to another route
       *
       * @param {string} from - if param 'to' is undefined redirects to 'from'
       * @param {string=} to
       * @api public
       */
      Page.prototype.redirect = function(from, to) {
        var inst = this;

        // Define route from a path to another
        if ('string' === typeof from && 'string' === typeof to) {
          page.call(this, from, function(e) {
            setTimeout(function() {
              inst.replace(/** @type {!string} */ (to));
            }, 0);
          });
        }

        // Wait for the push state and replace it with another
        if ('string' === typeof from && 'undefined' === typeof to) {
          setTimeout(function() {
            inst.replace(from);
          }, 0);
        }
      };

      /**
       * Replace `path` with optional `state` object.
       *
       * @param {string} path
       * @param {Object=} state
       * @param {boolean=} init
       * @param {boolean=} dispatch
       * @return {!Context}
       * @api public
       */


      Page.prototype.replace = function(path, state, init, dispatch) {
        var ctx = new Context(path, state, this),
          prev = this.prevContext;
        this.prevContext = ctx;
        this.current = ctx.path;
        ctx.init = init;
        ctx.save(); // save before dispatching, which may redirect
        if (false !== dispatch) this.dispatch(ctx, prev);
        return ctx;
      };

      /**
       * Dispatch the given `ctx`.
       *
       * @param {Context} ctx
       * @api private
       */

      Page.prototype.dispatch = function(ctx, prev) {
        var i = 0, j = 0, page = this;

        function nextExit() {
          var fn = page.exits[j++];
          if (!fn) return nextEnter();
          fn(prev, nextExit);
        }

        function nextEnter() {
          var fn = page.callbacks[i++];

          if (ctx.path !== page.current) {
            ctx.handled = false;
            return;
          }
          if (!fn) return unhandled.call(page, ctx);
          fn(ctx, nextEnter);
        }

        if (prev) {
          nextExit();
        } else {
          nextEnter();
        }
      };

      /**
       * Register an exit route on `path` with
       * callback `fn()`, which will be called
       * on the previous context when a new
       * page is visited.
       */
      Page.prototype.exit = function(path, fn) {
        if (typeof path === 'function') {
          return this.exit('*', path);
        }

        var route = new Route(path, null, this);
        for (var i = 1; i < arguments.length; ++i) {
          this.exits.push(route.middleware(arguments[i]));
        }
      };

      /**
       * Handle "click" events.
       */

      /* jshint +W054 */
      Page.prototype.clickHandler = function(e) {
        if (1 !== this._which(e)) return;

        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        if (e.defaultPrevented) return;

        // ensure link
        // use shadow dom when available if not, fall back to composedPath()
        // for browsers that only have shady
        var el = e.target;
        var eventPath = e.path || (e.composedPath ? e.composedPath() : null);

        if(eventPath) {
          for (var i = 0; i < eventPath.length; i++) {
            if (!eventPath[i].nodeName) continue;
            if (eventPath[i].nodeName.toUpperCase() !== 'A') continue;
            if (!eventPath[i].href) continue;

            el = eventPath[i];
            break;
          }
        }

        // continue ensure link
        // el.nodeName for svg links are 'a' instead of 'A'
        while (el && 'A' !== el.nodeName.toUpperCase()) el = el.parentNode;
        if (!el || 'A' !== el.nodeName.toUpperCase()) return;

        // check if link is inside an svg
        // in this case, both href and target are always inside an object
        var svg = (typeof el.href === 'object') && el.href.constructor.name === 'SVGAnimatedString';

        // Ignore if tag has
        // 1. "download" attribute
        // 2. rel="external" attribute
        if (el.hasAttribute('download') || el.getAttribute('rel') === 'external') return;

        // ensure non-hash for the same path
        var link = el.getAttribute('href');
        if(!this._hashbang && this._samePath(el) && (el.hash || '#' === link)) return;

        // Check for mailto: in the href
        if (link && link.indexOf('mailto:') > -1) return;

        // check target
        // svg target is an object and its desired value is in .baseVal property
        if (svg ? el.target.baseVal : el.target) return;

        // x-origin
        // note: svg links that are not relative don't call click events (and skip page.js)
        // consequently, all svg links tested inside page.js are relative and in the same origin
        if (!svg && !this.sameOrigin(el.href)) return;

        // rebuild path
        // There aren't .pathname and .search properties in svg links, so we use href
        // Also, svg href is an object and its desired value is in .baseVal property
        var path = svg ? el.href.baseVal : (el.pathname + el.search + (el.hash || ''));

        path = path[0] !== '/' ? '/' + path : path;

        // strip leading "/[drive letter]:" on NW.js on Windows
        if (hasProcess && path.match(/^\/[a-zA-Z]:\//)) {
          path = path.replace(/^\/[a-zA-Z]:\//, '/');
        }

        // same page
        var orig = path;
        var pageBase = this._getBase();

        if (path.indexOf(pageBase) === 0) {
          path = path.substr(pageBase.length);
        }

        if (this._hashbang) path = path.replace('#!', '');

        if (pageBase && orig === path && (!isLocation || this._window.location.protocol !== 'file:')) {
          return;
        }

        e.preventDefault();
        this.show(orig);
      };

      /**
       * Handle "populate" events.
       * @api private
       */

      Page.prototype._onpopstate = (function () {
        var loaded = false;
        if ( ! hasWindow ) {
          return function () {};
        }
        if (hasDocument && document.readyState === 'complete') {
          loaded = true;
        } else {
          window.addEventListener('load', function() {
            setTimeout(function() {
              loaded = true;
            }, 0);
          });
        }
        return function onpopstate(e) {
          if (!loaded) return;
          var page = this;
          if (e.state) {
            var path = e.state.path;
            page.replace(path, e.state);
          } else if (isLocation) {
            var loc = page._window.location;
            page.show(loc.pathname + loc.search + loc.hash, undefined, undefined, false);
          }
        };
      })();

      /**
       * Event button.
       */
      Page.prototype._which = function(e) {
        e = e || (hasWindow && this._window.event);
        return null == e.which ? e.button : e.which;
      };

      /**
       * Convert to a URL object
       * @api private
       */
      Page.prototype._toURL = function(href) {
        var window = this._window;
        if(typeof URL === 'function' && isLocation) {
          return new URL(href, window.location.toString());
        } else if (hasDocument) {
          var anc = window.document.createElement('a');
          anc.href = href;
          return anc;
        }
      };

      /**
       * Check if `href` is the same origin.
       * @param {string} href
       * @api public
       */
      Page.prototype.sameOrigin = function(href) {
        if(!href || !isLocation) return false;

        var url = this._toURL(href);
        var window = this._window;

        var loc = window.location;

        /*
           When the port is the default http port 80 for http, or 443 for
           https, internet explorer 11 returns an empty string for loc.port,
           so we need to compare loc.port with an empty string if url.port
           is the default port 80 or 443.
           Also the comparition with `port` is changed from `===` to `==` because
           `port` can be a string sometimes. This only applies to ie11.
        */
        return loc.protocol === url.protocol &&
          loc.hostname === url.hostname &&
          (loc.port === url.port || loc.port === '' && (url.port == 80 || url.port == 443)); // jshint ignore:line
      };

      /**
       * @api private
       */
      Page.prototype._samePath = function(url) {
        if(!isLocation) return false;
        var window = this._window;
        var loc = window.location;
        return url.pathname === loc.pathname &&
          url.search === loc.search;
      };

      /**
       * Remove URL encoding from the given `str`.
       * Accommodates whitespace in both x-www-form-urlencoded
       * and regular percent-encoded form.
       *
       * @param {string} val - URL component to decode
       * @api private
       */
      Page.prototype._decodeURLEncodedURIComponent = function(val) {
        if (typeof val !== 'string') { return val; }
        return this._decodeURLComponents ? decodeURIComponent(val.replace(/\+/g, ' ')) : val;
      };

      /**
       * Create a new `page` instance and function
       */
      function createPage() {
        var pageInstance = new Page();

        function pageFn(/* args */) {
          return page.apply(pageInstance, arguments);
        }

        // Copy all of the things over. In 2.0 maybe we use setPrototypeOf
        pageFn.callbacks = pageInstance.callbacks;
        pageFn.exits = pageInstance.exits;
        pageFn.base = pageInstance.base.bind(pageInstance);
        pageFn.strict = pageInstance.strict.bind(pageInstance);
        pageFn.start = pageInstance.start.bind(pageInstance);
        pageFn.stop = pageInstance.stop.bind(pageInstance);
        pageFn.show = pageInstance.show.bind(pageInstance);
        pageFn.back = pageInstance.back.bind(pageInstance);
        pageFn.redirect = pageInstance.redirect.bind(pageInstance);
        pageFn.replace = pageInstance.replace.bind(pageInstance);
        pageFn.dispatch = pageInstance.dispatch.bind(pageInstance);
        pageFn.exit = pageInstance.exit.bind(pageInstance);
        pageFn.configure = pageInstance.configure.bind(pageInstance);
        pageFn.sameOrigin = pageInstance.sameOrigin.bind(pageInstance);
        pageFn.clickHandler = pageInstance.clickHandler.bind(pageInstance);

        pageFn.create = createPage;

        Object.defineProperty(pageFn, 'len', {
          get: function(){
            return pageInstance.len;
          },
          set: function(val) {
            pageInstance.len = val;
          }
        });

        Object.defineProperty(pageFn, 'current', {
          get: function(){
            return pageInstance.current;
          },
          set: function(val) {
            pageInstance.current = val;
          }
        });

        // In 2.0 these can be named exports
        pageFn.Context = Context;
        pageFn.Route = Route;

        return pageFn;
      }

      /**
       * Register `path` with callback `fn()`,
       * or route `path`, or redirection,
       * or `page.start()`.
       *
       *   page(fn);
       *   page('*', fn);
       *   page('/user/:id', load, user);
       *   page('/user/' + user.id, { some: 'thing' });
       *   page('/user/' + user.id);
       *   page('/from', '/to')
       *   page();
       *
       * @param {string|!Function|!Object} path
       * @param {Function=} fn
       * @api public
       */

      function page(path, fn) {
        // <callback>
        if ('function' === typeof path) {
          return page.call(this, '*', path);
        }

        // route <path> to <callback ...>
        if ('function' === typeof fn) {
          var route = new Route(/** @type {string} */ (path), null, this);
          for (var i = 1; i < arguments.length; ++i) {
            this.callbacks.push(route.middleware(arguments[i]));
          }
          // show <path> with [state]
        } else if ('string' === typeof path) {
          this['string' === typeof fn ? 'redirect' : 'show'](path, fn);
          // start [options]
        } else {
          this.start(path);
        }
      }

      /**
       * Unhandled `ctx`. When it's not the initial
       * popstate then redirect. If you wish to handle
       * 404s on your own use `page('*', callback)`.
       *
       * @param {Context} ctx
       * @api private
       */
      function unhandled(ctx) {
        if (ctx.handled) return;
        var current;
        var page = this;
        var window = page._window;

        if (page._hashbang) {
          current = isLocation && this._getBase() + window.location.hash.replace('#!', '');
        } else {
          current = isLocation && window.location.pathname + window.location.search;
        }

        if (current === ctx.canonicalPath) return;
        page.stop();
        ctx.handled = false;
        isLocation && (window.location.href = ctx.canonicalPath);
      }

      /**
       * Escapes RegExp characters in the given string.
       *
       * @param {string} s
       * @api private
       */
      function escapeRegExp(s) {
        return s.replace(/([.+*?=^!:${}()[\]|/\\])/g, '\\$1');
      }

      /**
       * Initialize a new "request" `Context`
       * with the given `path` and optional initial `state`.
       *
       * @constructor
       * @param {string} path
       * @param {Object=} state
       * @api public
       */

      function Context(path, state, pageInstance) {
        var _page = this.page = pageInstance || page;
        var window = _page._window;
        var hashbang = _page._hashbang;

        var pageBase = _page._getBase();
        if ('/' === path[0] && 0 !== path.indexOf(pageBase)) path = pageBase + (hashbang ? '#!' : '') + path;
        var i = path.indexOf('?');

        this.canonicalPath = path;
        var re = new RegExp('^' + escapeRegExp(pageBase));
        this.path = path.replace(re, '') || '/';
        if (hashbang) this.path = this.path.replace('#!', '') || '/';

        this.title = (hasDocument && window.document.title);
        this.state = state || {};
        this.state.path = path;
        this.querystring = ~i ? _page._decodeURLEncodedURIComponent(path.slice(i + 1)) : '';
        this.pathname = _page._decodeURLEncodedURIComponent(~i ? path.slice(0, i) : path);
        this.params = {};

        // fragment
        this.hash = '';
        if (!hashbang) {
          if (!~this.path.indexOf('#')) return;
          var parts = this.path.split('#');
          this.path = this.pathname = parts[0];
          this.hash = _page._decodeURLEncodedURIComponent(parts[1]) || '';
          this.querystring = this.querystring.split('#')[0];
        }
      }

      /**
       * Push state.
       *
       * @api private
       */

      Context.prototype.pushState = function() {
        var page = this.page;
        var window = page._window;
        var hashbang = page._hashbang;

        page.len++;
        if (hasHistory) {
            window.history.pushState(this.state, this.title,
              hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
        }
      };

      /**
       * Save the context state.
       *
       * @api public
       */

      Context.prototype.save = function() {
        var page = this.page;
        if (hasHistory) {
            page._window.history.replaceState(this.state, this.title,
              page._hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
        }
      };

      /**
       * Initialize `Route` with the given HTTP `path`,
       * and an array of `callbacks` and `options`.
       *
       * Options:
       *
       *   - `sensitive`    enable case-sensitive routes
       *   - `strict`       enable strict matching for trailing slashes
       *
       * @constructor
       * @param {string} path
       * @param {Object=} options
       * @api private
       */

      function Route(path, options, page) {
        var _page = this.page = page || globalPage;
        var opts = options || {};
        opts.strict = opts.strict || _page._strict;
        this.path = (path === '*') ? '(.*)' : path;
        this.method = 'GET';
        this.regexp = pathToRegexp_1(this.path, this.keys = [], opts);
      }

      /**
       * Return route middleware with
       * the given callback `fn()`.
       *
       * @param {Function} fn
       * @return {Function}
       * @api public
       */

      Route.prototype.middleware = function(fn) {
        var self = this;
        return function(ctx, next) {
          if (self.match(ctx.path, ctx.params)) {
            ctx.routePath = self.path;
            return fn(ctx, next);
          }
          next();
        };
      };

      /**
       * Check if this route matches `path`, if so
       * populate `params`.
       *
       * @param {string} path
       * @param {Object} params
       * @return {boolean}
       * @api private
       */

      Route.prototype.match = function(path, params) {
        var keys = this.keys,
          qsIndex = path.indexOf('?'),
          pathname = ~qsIndex ? path.slice(0, qsIndex) : path,
          m = this.regexp.exec(decodeURIComponent(pathname));

        if (!m) return false;

        delete params[0];

        for (var i = 1, len = m.length; i < len; ++i) {
          var key = keys[i - 1];
          var val = this.page._decodeURLEncodedURIComponent(m[i]);
          if (val !== undefined || !(hasOwnProperty.call(params, key.name))) {
            params[key.name] = val;
          }
        }

        return true;
      };


      /**
       * Module exports.
       */

      var globalPage = createPage();
      var page_js = globalPage;
      var default_1 = globalPage;

    page_js.default = default_1;

    return page_js;

    })));
    });

    /* src\components\Modal.svelte generated by Svelte v3.46.4 */

    function create_fragment$b(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[0],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[0])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Modal', slots, ['default']);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Modal> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Modal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init$1(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Modal",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* src\components\CharityList.svelte generated by Svelte v3.46.4 */
    const file$8 = "src\\components\\CharityList.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (55:4) {#if charities !== undefined}
    function create_if_block$1(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*charities*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*charities, calculateDaysRemaining, calculateFunded, formatCurency, handleCloseModal, isModalOpen*/ 7) {
    				each_value = /*charities*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(55:4) {#if charities !== undefined}",
    		ctx
    	});

    	return block;
    }

    // (59:8) {#if isModalOpen === true}
    function create_if_block_1(ctx) {
    	let modal;
    	let current;

    	modal = new Modal({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(modal.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const modal_changes = {};

    			if (dirty & /*$$scope, charities*/ 129) {
    				modal_changes.$$scope = { dirty, ctx };
    			}

    			modal.$set(modal_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(59:8) {#if isModalOpen === true}",
    		ctx
    	});

    	return block;
    }

    // (60:8) <Modal>
    function create_default_slot(ctx) {
    	let div9;
    	let div8;
    	let div7;
    	let div0;
    	let h5;
    	let t0_value = /*charity*/ ctx[4].title + "";
    	let t0;
    	let t1;
    	let t2;
    	let button0;
    	let span;
    	let t4;
    	let div5;
    	let form;
    	let div1;
    	let label0;
    	let t6;
    	let input0;
    	let t7;
    	let div2;
    	let label1;
    	let t9;
    	let input1;
    	let t10;
    	let div3;
    	let label2;
    	let t12;
    	let input2;
    	let t13;
    	let div4;
    	let input3;
    	let t14;
    	let label3;
    	let t16;
    	let div6;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div9 = element("div");
    			div8 = element("div");
    			div7 = element("div");
    			div0 = element("div");
    			h5 = element("h5");
    			t0 = text(t0_value);
    			t1 = text("\r\n                  floats");
    			t2 = space();
    			button0 = element("button");
    			span = element("span");
    			span.textContent = "×";
    			t4 = space();
    			div5 = element("div");
    			form = element("form");
    			div1 = element("div");
    			label0 = element("label");
    			label0.textContent = "Amount donation";
    			t6 = space();
    			input0 = element("input");
    			t7 = space();
    			div2 = element("div");
    			label1 = element("label");
    			label1.textContent = "Your name";
    			t9 = space();
    			input1 = element("input");
    			t10 = space();
    			div3 = element("div");
    			label2 = element("label");
    			label2.textContent = "Email address";
    			t12 = space();
    			input2 = element("input");
    			t13 = space();
    			div4 = element("div");
    			input3 = element("input");
    			t14 = space();
    			label3 = element("label");
    			label3.textContent = "I Agree";
    			t16 = space();
    			div6 = element("div");
    			button1 = element("button");
    			button1.textContent = "Continue";
    			attr_dev(h5, "class", "modal-title");
    			attr_dev(h5, "id", "exampleModalLabel");
    			add_location(h5, file$8, 67, 16, 1963);
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$8, 72, 18, 2238);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "close");
    			attr_dev(button0, "data-dismiss", "modal");
    			attr_dev(button0, "aria-label", "Close");
    			add_location(button0, file$8, 69, 16, 2075);
    			attr_dev(div0, "class", "modal-header");
    			add_location(div0, file$8, 66, 14, 1919);
    			attr_dev(label0, "for", "exampleInputAmount");
    			add_location(label0, file$8, 78, 20, 2456);
    			input0.required = true;
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "class", "form-control");
    			attr_dev(input0, "id", "exampleInputAmount");
    			attr_dev(input0, "aria-describedby", "amountHelp");
    			attr_dev(input0, "placeholder", "Enter amount");
    			add_location(input0, file$8, 79, 20, 2533);
    			attr_dev(div1, "class", "form-group");
    			add_location(div1, file$8, 77, 18, 2410);
    			attr_dev(label1, "for", "exampleInputName");
    			add_location(label1, file$8, 83, 20, 2780);
    			input1.required = true;
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "id", "exampleInputName");
    			attr_dev(input1, "aria-describedby", "nameHelp");
    			attr_dev(input1, "placeholder", "Enter full name");
    			add_location(input1, file$8, 84, 20, 2849);
    			attr_dev(div2, "class", "form-group");
    			add_location(div2, file$8, 82, 18, 2734);
    			attr_dev(label2, "for", "exampleInputEmail1");
    			add_location(label2, file$8, 88, 20, 3093);
    			input2.required = true;
    			attr_dev(input2, "type", "email");
    			attr_dev(input2, "class", "form-control");
    			attr_dev(input2, "id", "exampleInputEmail1");
    			attr_dev(input2, "aria-describedby", "emailHelp");
    			attr_dev(input2, "placeholder", "Enter email");
    			add_location(input2, file$8, 89, 20, 3168);
    			attr_dev(div3, "class", "form-group");
    			add_location(div3, file$8, 87, 18, 3047);
    			attr_dev(input3, "type", "checkbox");
    			attr_dev(input3, "class", "form-check-input");
    			attr_dev(input3, "id", "exampleCheck1");
    			add_location(input3, file$8, 93, 20, 3412);
    			attr_dev(label3, "class", "form-check-label");
    			attr_dev(label3, "for", "exampleCheck1");
    			add_location(label3, file$8, 94, 20, 3501);
    			attr_dev(div4, "class", "form-check");
    			add_location(div4, file$8, 92, 18, 3366);
    			add_location(form, file$8, 76, 16, 2384);
    			attr_dev(div5, "class", "modal-body");
    			add_location(div5, file$8, 75, 14, 2342);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-primary");
    			add_location(button1, file$8, 99, 16, 3701);
    			attr_dev(div6, "class", "modal-footer");
    			add_location(div6, file$8, 98, 14, 3657);
    			attr_dev(div7, "class", "modal-content");
    			add_location(div7, file$8, 65, 12, 1876);
    			attr_dev(div8, "class", "modal-dialog");
    			attr_dev(div8, "role", "document");
    			add_location(div8, file$8, 64, 10, 1820);
    			attr_dev(div9, "class", "modal fade show svelte-1wyulz1");
    			attr_dev(div9, "id", "exampleModal");
    			attr_dev(div9, "tabindex", "-1");
    			attr_dev(div9, "role", "dialog");
    			attr_dev(div9, "aria-labelledby", "exampleModalLabel");
    			add_location(div9, file$8, 62, 5, 1685);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, div0);
    			append_dev(div0, h5);
    			append_dev(h5, t0);
    			append_dev(h5, t1);
    			append_dev(div0, t2);
    			append_dev(div0, button0);
    			append_dev(button0, span);
    			append_dev(div7, t4);
    			append_dev(div7, div5);
    			append_dev(div5, form);
    			append_dev(form, div1);
    			append_dev(div1, label0);
    			append_dev(div1, t6);
    			append_dev(div1, input0);
    			append_dev(form, t7);
    			append_dev(form, div2);
    			append_dev(div2, label1);
    			append_dev(div2, t9);
    			append_dev(div2, input1);
    			append_dev(form, t10);
    			append_dev(form, div3);
    			append_dev(div3, label2);
    			append_dev(div3, t12);
    			append_dev(div3, input2);
    			append_dev(form, t13);
    			append_dev(form, div4);
    			append_dev(div4, input3);
    			append_dev(div4, t14);
    			append_dev(div4, label3);
    			append_dev(div7, t16);
    			append_dev(div7, div6);
    			append_dev(div6, button1);

    			if (!mounted) {
    				dispose = listen_dev(button0, "click", /*handleCloseModal*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*charities*/ 1 && t0_value !== (t0_value = /*charity*/ ctx[4].title + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div9);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(60:8) <Modal>",
    		ctx
    	});

    	return block;
    }

    // (56:4) {#each charities as charity}
    function create_each_block(ctx) {
    	let div9;
    	let div8;
    	let t0;
    	let div7;
    	let div2;
    	let img0;
    	let img0_src_value;
    	let t1;
    	let div1;
    	let div0;
    	let p;
    	let span0;
    	let t2_value = calculateFunded(/*charity*/ ctx[4].pledged, /*charity*/ ctx[4].target) + "";
    	let t2;
    	let t3;
    	let t4;
    	let div6;
    	let ul0;
    	let li0;
    	let a0;
    	let t5_value = /*charity*/ ctx[4].category + "";
    	let t5;
    	let t6;
    	let a1;
    	let t7_value = /*charity*/ ctx[4].title + "";
    	let t7;
    	let t8;
    	let ul1;
    	let li1;
    	let t9_value = formatCurency(/*charity*/ ctx[4].pledged) + "";
    	let t9;
    	let t10;
    	let span1;
    	let t12;
    	let li2;
    	let span2;
    	let t13_value = calculateFunded(/*charity*/ ctx[4].pledged, /*charity*/ ctx[4].target) + "";
    	let t13;
    	let t14;
    	let span3;
    	let t16;
    	let li3;
    	let t17_value = calculateDaysRemaining(/*charity*/ ctx[4].date_end) + "";
    	let t17;
    	let t18;
    	let span4;
    	let t20;
    	let span5;
    	let t21;
    	let div5;
    	let div3;
    	let img1;
    	let img1_src_value;
    	let t22;
    	let div4;
    	let a2;
    	let span6;
    	let t24;
    	let t25_value = /*charity*/ ctx[4].profile_name + "";
    	let t25;
    	let t26;
    	let span7;
    	let t27;
    	let a3;
    	let t28;
    	let a3_href_value;
    	let t29;
    	let current;
    	let if_block = /*isModalOpen*/ ctx[1] === true && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			div9 = element("div");
    			div8 = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			div7 = element("div");
    			div2 = element("div");
    			img0 = element("img");
    			t1 = space();
    			div1 = element("div");
    			div0 = element("div");
    			p = element("p");
    			span0 = element("span");
    			t2 = text(t2_value);
    			t3 = text("\r\n                %");
    			t4 = space();
    			div6 = element("div");
    			ul0 = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			t5 = text(t5_value);
    			t6 = space();
    			a1 = element("a");
    			t7 = text(t7_value);
    			t8 = space();
    			ul1 = element("ul");
    			li1 = element("li");
    			t9 = text(t9_value);
    			t10 = space();
    			span1 = element("span");
    			span1.textContent = "Pledged";
    			t12 = space();
    			li2 = element("li");
    			span2 = element("span");
    			t13 = text(t13_value);
    			t14 = text("\r\n                % \r\n                ");
    			span3 = element("span");
    			span3.textContent = "Funded";
    			t16 = space();
    			li3 = element("li");
    			t17 = text(t17_value);
    			t18 = space();
    			span4 = element("span");
    			span4.textContent = "Days to go";
    			t20 = space();
    			span5 = element("span");
    			t21 = space();
    			div5 = element("div");
    			div3 = element("div");
    			img1 = element("img");
    			t22 = space();
    			div4 = element("div");
    			a2 = element("a");
    			span6 = element("span");
    			span6.textContent = "By";
    			t24 = space();
    			t25 = text(t25_value);
    			t26 = space();
    			span7 = element("span");
    			t27 = space();
    			a3 = element("a");
    			t28 = text("Donate This Cause");
    			t29 = space();
    			if (!src_url_equal(img0.src, img0_src_value = /*charity*/ ctx[4].thumbnail)) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$8, 109, 12, 3982);
    			attr_dev(span0, "class", "number-percentage-count number-percentage");
    			attr_dev(span0, "data-value", "90");
    			attr_dev(span0, "data-animation-duration", "3500");
    			add_location(span0, file$8, 113, 19, 4127);
    			add_location(p, file$8, 113, 16, 4124);
    			attr_dev(div0, "class", "xs-skill-track");
    			add_location(div0, file$8, 112, 14, 4077);
    			attr_dev(div1, "class", "xs-skill-bar");
    			add_location(div1, file$8, 111, 12, 4035);
    			attr_dev(div2, "class", "xs-item-header");
    			add_location(div2, file$8, 107, 10, 3938);
    			attr_dev(a0, "href", "");
    			add_location(a0, file$8, 126, 16, 4619);
    			add_location(li0, file$8, 125, 14, 4597);
    			attr_dev(ul0, "class", "xs-simple-tag xs-mb-20");
    			add_location(ul0, file$8, 124, 12, 4546);
    			attr_dev(a1, "href", "#");
    			attr_dev(a1, "class", "xs-post-title xs-mb-30");
    			add_location(a1, file$8, 130, 12, 4708);
    			add_location(span1, file$8, 137, 16, 4937);
    			add_location(li1, file$8, 135, 14, 4865);
    			attr_dev(span2, "class", "number-percentage-count number-percentage");
    			attr_dev(span2, "data-value", "90");
    			attr_dev(span2, "data-animation-duration", "3500");
    			add_location(span2, file$8, 140, 16, 5016);
    			add_location(span3, file$8, 147, 16, 5310);
    			add_location(li2, file$8, 139, 14, 4994);
    			add_location(span4, file$8, 151, 16, 5448);
    			add_location(li3, file$8, 149, 14, 5366);
    			attr_dev(ul1, "class", "xs-list-with-content svelte-1wyulz1");
    			add_location(ul1, file$8, 134, 12, 4816);
    			attr_dev(span5, "class", "xs-separetor");
    			add_location(span5, file$8, 155, 12, 5527);
    			if (!src_url_equal(img1.src, img1_src_value = /*charity*/ ctx[4].profile_photo)) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$8, 159, 16, 5669);
    			attr_dev(div3, "class", "xs-round-avatar");
    			add_location(div3, file$8, 158, 14, 5622);
    			add_location(span6, file$8, 162, 28, 5808);
    			attr_dev(a2, "href", "#");
    			add_location(a2, file$8, 162, 16, 5796);
    			attr_dev(div4, "class", "xs-avatar-title");
    			add_location(div4, file$8, 161, 14, 5749);
    			attr_dev(div5, "class", "row xs-margin-0");
    			add_location(div5, file$8, 157, 12, 5577);
    			attr_dev(span7, "class", "xs-separetor");
    			add_location(span7, file$8, 168, 12, 5946);
    			attr_dev(a3, "href", a3_href_value = "/donation/" + /*charity*/ ctx[4].id);
    			attr_dev(a3, "data-toggle", "modal");
    			attr_dev(a3, "data-target", "#exampleModal");
    			attr_dev(a3, "class", "btn btn-primary btn-block");
    			add_location(a3, file$8, 170, 12, 5996);
    			attr_dev(div6, "class", "xs-item-content");
    			add_location(div6, file$8, 123, 10, 4503);
    			attr_dev(div7, "class", "xs-popular-item xs-box-shadow");
    			add_location(div7, file$8, 106, 8, 3883);
    			attr_dev(div8, "class", "col-lg-4 col-md-6");
    			add_location(div8, file$8, 57, 6, 1537);
    			attr_dev(div9, "class", "row");
    			add_location(div9, file$8, 56, 4, 1512);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div8);
    			if (if_block) if_block.m(div8, null);
    			append_dev(div8, t0);
    			append_dev(div8, div7);
    			append_dev(div7, div2);
    			append_dev(div2, img0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, p);
    			append_dev(p, span0);
    			append_dev(span0, t2);
    			append_dev(p, t3);
    			append_dev(div7, t4);
    			append_dev(div7, div6);
    			append_dev(div6, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, a0);
    			append_dev(a0, t5);
    			append_dev(div6, t6);
    			append_dev(div6, a1);
    			append_dev(a1, t7);
    			append_dev(div6, t8);
    			append_dev(div6, ul1);
    			append_dev(ul1, li1);
    			append_dev(li1, t9);
    			append_dev(li1, t10);
    			append_dev(li1, span1);
    			append_dev(ul1, t12);
    			append_dev(ul1, li2);
    			append_dev(li2, span2);
    			append_dev(span2, t13);
    			append_dev(li2, t14);
    			append_dev(li2, span3);
    			append_dev(ul1, t16);
    			append_dev(ul1, li3);
    			append_dev(li3, t17);
    			append_dev(li3, t18);
    			append_dev(li3, span4);
    			append_dev(div6, t20);
    			append_dev(div6, span5);
    			append_dev(div6, t21);
    			append_dev(div6, div5);
    			append_dev(div5, div3);
    			append_dev(div3, img1);
    			append_dev(div5, t22);
    			append_dev(div5, div4);
    			append_dev(div4, a2);
    			append_dev(a2, span6);
    			append_dev(a2, t24);
    			append_dev(a2, t25);
    			append_dev(div6, t26);
    			append_dev(div6, span7);
    			append_dev(div6, t27);
    			append_dev(div6, a3);
    			append_dev(a3, t28);
    			append_dev(div9, t29);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*isModalOpen*/ ctx[1] === true) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*isModalOpen*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div8, t0);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*charities*/ 1 && !src_url_equal(img0.src, img0_src_value = /*charity*/ ctx[4].thumbnail)) {
    				attr_dev(img0, "src", img0_src_value);
    			}

    			if ((!current || dirty & /*charities*/ 1) && t2_value !== (t2_value = calculateFunded(/*charity*/ ctx[4].pledged, /*charity*/ ctx[4].target) + "")) set_data_dev(t2, t2_value);
    			if ((!current || dirty & /*charities*/ 1) && t5_value !== (t5_value = /*charity*/ ctx[4].category + "")) set_data_dev(t5, t5_value);
    			if ((!current || dirty & /*charities*/ 1) && t7_value !== (t7_value = /*charity*/ ctx[4].title + "")) set_data_dev(t7, t7_value);
    			if ((!current || dirty & /*charities*/ 1) && t9_value !== (t9_value = formatCurency(/*charity*/ ctx[4].pledged) + "")) set_data_dev(t9, t9_value);
    			if ((!current || dirty & /*charities*/ 1) && t13_value !== (t13_value = calculateFunded(/*charity*/ ctx[4].pledged, /*charity*/ ctx[4].target) + "")) set_data_dev(t13, t13_value);
    			if ((!current || dirty & /*charities*/ 1) && t17_value !== (t17_value = calculateDaysRemaining(/*charity*/ ctx[4].date_end) + "")) set_data_dev(t17, t17_value);

    			if (!current || dirty & /*charities*/ 1 && !src_url_equal(img1.src, img1_src_value = /*charity*/ ctx[4].profile_photo)) {
    				attr_dev(img1, "src", img1_src_value);
    			}

    			if ((!current || dirty & /*charities*/ 1) && t25_value !== (t25_value = /*charity*/ ctx[4].profile_name + "")) set_data_dev(t25, t25_value);

    			if (!current || dirty & /*charities*/ 1 && a3_href_value !== (a3_href_value = "/donation/" + /*charity*/ ctx[4].id)) {
    				attr_dev(a3, "href", a3_href_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div9);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(56:4) {#each charities as charity}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let section;
    	let div2;
    	let div1;
    	let div0;
    	let h2;
    	let t1;
    	let span;
    	let t2;
    	let p;
    	let t3;
    	let br;
    	let t4;
    	let t5;
    	let current;
    	let if_block = /*charities*/ ctx[0] !== undefined && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			section = element("section");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Popular Causes";
    			t1 = space();
    			span = element("span");
    			t2 = space();
    			p = element("p");
    			t3 = text("FundPress has built a platform focused on aiding entrepreneurs, startups, and ");
    			br = element("br");
    			t4 = text(" companies\r\n          raise capital from anyone.");
    			t5 = space();
    			if (if_block) if_block.c();
    			attr_dev(h2, "class", "xs-title");
    			add_location(h2, file$8, 48, 8, 1123);
    			attr_dev(span, "class", "xs-separetor dashed");
    			add_location(span, file$8, 49, 8, 1173);
    			add_location(br, file$8, 50, 89, 1305);
    			add_location(p, file$8, 50, 8, 1224);
    			attr_dev(div0, "class", "col-md-9 col-xl-9");
    			add_location(div0, file$8, 47, 6, 1082);
    			attr_dev(div1, "class", "xs-heading row xs-mb-60");
    			add_location(div1, file$8, 46, 4, 1037);
    			attr_dev(div2, "class", "container");
    			add_location(div2, file$8, 45, 2, 1008);
    			attr_dev(section, "id", "popularcause");
    			attr_dev(section, "class", "bg-gray waypoint-tigger xs-section-padding");
    			add_location(section, file$8, 44, 0, 926);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t1);
    			append_dev(div0, span);
    			append_dev(div0, t2);
    			append_dev(div0, p);
    			append_dev(p, t3);
    			append_dev(p, br);
    			append_dev(p, t4);
    			append_dev(div2, t5);
    			if (if_block) if_block.m(div2, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*charities*/ ctx[0] !== undefined) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*charities*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div2, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function calculateFunded(pledged, target) {
    	return Math.round(1 / (target / pledged) * 100);
    }

    function formatCurency(nominal) {
    	return nominal.toLocaleString("id-ID", { style: "currency", currency: "IDR" });
    }

    function calculateDaysRemaining(date_end) {
    	const delta = date_end - new Date();
    	const oneDay = 24 * 60 * 60 * 1000;
    	return Math.round(Math.abs(delta / oneDay));
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('CharityList', slots, []);
    	let { charities } = $$props;
    	let isModalOpen = false;

    	function handleButton() {
    		$$invalidate(1, isModalOpen = true);
    	}

    	function handleCloseModal() {
    		$$invalidate(1, isModalOpen = false);
    	}

    	const writable_props = ['charities'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<CharityList> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('charities' in $$props) $$invalidate(0, charities = $$props.charities);
    	};

    	$$self.$capture_state = () => ({
    		Modal,
    		charities,
    		isModalOpen,
    		calculateFunded,
    		formatCurency,
    		calculateDaysRemaining,
    		handleButton,
    		handleCloseModal
    	});

    	$$self.$inject_state = $$props => {
    		if ('charities' in $$props) $$invalidate(0, charities = $$props.charities);
    		if ('isModalOpen' in $$props) $$invalidate(1, isModalOpen = $$props.isModalOpen);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [charities, isModalOpen, handleCloseModal];
    }

    class CharityList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init$1(this, options, instance$a, create_fragment$a, safe_not_equal, { charities: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CharityList",
    			options,
    			id: create_fragment$a.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*charities*/ ctx[0] === undefined && !('charities' in props)) {
    			console.warn("<CharityList> was created without expected prop 'charities'");
    		}
    	}

    	get charities() {
    		throw new Error("<CharityList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set charities(value) {
    		throw new Error("<CharityList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Header.svelte generated by Svelte v3.46.4 */

    const file$7 = "src\\components\\Header.svelte";

    function create_fragment$9(ctx) {
    	let header;
    	let div6;
    	let nav;
    	let div1;
    	let div0;
    	let t0;
    	let a0;
    	let img0;
    	let img0_src_value;
    	let t1;
    	let div5;
    	let div2;
    	let a1;
    	let img1;
    	let img1_src_value;
    	let t2;
    	let div3;
    	let ul;
    	let li0;
    	let a2;
    	let t4;
    	let li1;
    	let a3;
    	let t6;
    	let li2;
    	let a4;
    	let t8;
    	let div4;
    	let a5;
    	let span;
    	let i;
    	let t9;

    	const block = {
    		c: function create() {
    			header = element("header");
    			div6 = element("div");
    			nav = element("nav");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			a0 = element("a");
    			img0 = element("img");
    			t1 = space();
    			div5 = element("div");
    			div2 = element("div");
    			a1 = element("a");
    			img1 = element("img");
    			t2 = space();
    			div3 = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			a2 = element("a");
    			a2.textContent = "home";
    			t4 = space();
    			li1 = element("li");
    			a3 = element("a");
    			a3.textContent = "about";
    			t6 = space();
    			li2 = element("li");
    			a4 = element("a");
    			a4.textContent = "Contact";
    			t8 = space();
    			div4 = element("div");
    			a5 = element("a");
    			span = element("span");
    			i = element("i");
    			t9 = text(" Donate Now");
    			attr_dev(div0, "class", "nav-toggle");
    			add_location(div0, file$7, 5, 5, 163);
    			if (!src_url_equal(img0.src, img0_src_value = "/assets/images/logo.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$7, 7, 6, 237);
    			attr_dev(a0, "href", "/");
    			attr_dev(a0, "class", "nav-logo");
    			add_location(a0, file$7, 6, 5, 200);
    			attr_dev(div1, "class", "nav-header");
    			add_location(div1, file$7, 4, 4, 132);
    			if (!src_url_equal(img1.src, img1_src_value = "/assets/images/logo.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$7, 13, 7, 471);
    			attr_dev(a1, "class", "nav-brand");
    			attr_dev(a1, "href", "/");
    			add_location(a1, file$7, 12, 6, 432);
    			attr_dev(div2, "class", "xs-logo-wraper col-lg-2 xs-padding-0");
    			add_location(div2, file$7, 11, 5, 374);
    			attr_dev(a2, "href", "/");
    			add_location(a2, file$7, 18, 11, 637);
    			add_location(li0, file$7, 18, 7, 633);
    			attr_dev(a3, "href", "/about");
    			add_location(a3, file$7, 19, 11, 675);
    			add_location(li1, file$7, 19, 7, 671);
    			attr_dev(a4, "href", "/contact");
    			add_location(a4, file$7, 20, 11, 719);
    			add_location(li2, file$7, 20, 7, 715);
    			attr_dev(ul, "class", "nav-menu");
    			add_location(ul, file$7, 17, 6, 603);
    			attr_dev(div3, "class", "col-lg-7");
    			add_location(div3, file$7, 16, 5, 573);
    			attr_dev(i, "class", "fa fa-heart");
    			add_location(i, file$7, 25, 27, 949);
    			attr_dev(span, "class", "badge");
    			add_location(span, file$7, 25, 7, 929);
    			attr_dev(a5, "href", "#popularcause");
    			attr_dev(a5, "class", "btn btn-primary");
    			add_location(a5, file$7, 24, 6, 872);
    			attr_dev(div4, "class", "xs-navs-button d-flex-center-end col-lg-3");
    			add_location(div4, file$7, 23, 5, 809);
    			attr_dev(div5, "class", "nav-menus-wrapper row");
    			add_location(div5, file$7, 10, 4, 332);
    			attr_dev(nav, "class", "xs-menus");
    			add_location(nav, file$7, 3, 3, 104);
    			attr_dev(div6, "class", "container");
    			add_location(div6, file$7, 2, 2, 76);
    			attr_dev(header, "class", "xs-header header-transparent");
    			add_location(header, file$7, 1, 1, 27);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, div6);
    			append_dev(div6, nav);
    			append_dev(nav, div1);
    			append_dev(div1, div0);
    			append_dev(div1, t0);
    			append_dev(div1, a0);
    			append_dev(a0, img0);
    			append_dev(nav, t1);
    			append_dev(nav, div5);
    			append_dev(div5, div2);
    			append_dev(div2, a1);
    			append_dev(a1, img1);
    			append_dev(div5, t2);
    			append_dev(div5, div3);
    			append_dev(div3, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a2);
    			append_dev(ul, t4);
    			append_dev(ul, li1);
    			append_dev(li1, a3);
    			append_dev(ul, t6);
    			append_dev(ul, li2);
    			append_dev(li2, a4);
    			append_dev(div5, t8);
    			append_dev(div5, div4);
    			append_dev(div4, a5);
    			append_dev(a5, span);
    			append_dev(span, i);
    			append_dev(a5, t9);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Header', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init$1(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src\components\Welcome.svelte generated by Svelte v3.46.4 */

    const file$6 = "src\\components\\Welcome.svelte";

    function create_fragment$8(ctx) {
    	let section;
    	let div4;
    	let div3;
    	let div1;
    	let div0;
    	let h2;
    	let t1;
    	let p;
    	let t2;
    	let br;
    	let t3;
    	let t4;
    	let a;
    	let t6;
    	let div2;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div4 = element("div");
    			div3 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Yuk Kita Berbagi";
    			t1 = space();
    			p = element("p");
    			t2 = text("Saatnya Berbagi Untuk Sesama \r\n              ");
    			br = element("br");
    			t3 = text("\r\n              Uluran Tangan Anda Sangat Membantu Mereka");
    			t4 = space();
    			a = element("a");
    			a.textContent = "Fokus Bantuan Kami";
    			t6 = space();
    			div2 = element("div");
    			add_location(h2, file$6, 8, 12, 272);
    			add_location(br, file$6, 11, 14, 376);
    			add_location(p, file$6, 9, 12, 312);
    			attr_dev(a, "href", "#popularcause");
    			attr_dev(a, "class", "btn btn-outline-primary");
    			add_location(a, file$6, 14, 12, 471);
    			attr_dev(div0, "class", "xs-welcome-wraper color-white");
    			add_location(div0, file$6, 7, 10, 215);
    			attr_dev(div1, "class", "container");
    			add_location(div1, file$6, 6, 8, 180);
    			attr_dev(div2, "class", "xs-black-overlay");
    			add_location(div2, file$6, 21, 8, 699);
    			attr_dev(div3, "class", "xs-welcome-content");
    			set_style(div3, "background-image", "url(assets/images/slide1.png)");
    			add_location(div3, file$6, 3, 6, 63);
    			add_location(div4, file$6, 2, 4, 50);
    			attr_dev(section, "class", "");
    			add_location(section, file$6, 1, 0, 26);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div4);
    			append_dev(div4, div3);
    			append_dev(div3, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t1);
    			append_dev(div0, p);
    			append_dev(p, t2);
    			append_dev(p, br);
    			append_dev(p, t3);
    			append_dev(div0, t4);
    			append_dev(div0, a);
    			append_dev(div3, t6);
    			append_dev(div3, div2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Welcome', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Welcome> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Welcome extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init$1(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Welcome",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src\components\Promo.svelte generated by Svelte v3.46.4 */

    const file$5 = "src\\components\\Promo.svelte";

    function create_fragment$7(ctx) {
    	let section;
    	let div10;
    	let div0;
    	let h2;
    	let t0;
    	let span0;
    	let t2;
    	let br0;
    	let t3;
    	let t4;
    	let div9;
    	let div2;
    	let div1;
    	let span1;
    	let t5;
    	let h50;
    	let t6;
    	let br1;
    	let t7;
    	let t8;
    	let p0;
    	let t10;
    	let div4;
    	let div3;
    	let span2;
    	let t11;
    	let h51;
    	let t12;
    	let br2;
    	let t13;
    	let t14;
    	let p1;
    	let t16;
    	let div6;
    	let div5;
    	let span3;
    	let t17;
    	let h52;
    	let t18;
    	let br3;
    	let t19;
    	let t20;
    	let p2;
    	let t22;
    	let div8;
    	let div7;
    	let span4;
    	let t23;
    	let h53;
    	let t24;
    	let br4;
    	let t25;
    	let t26;
    	let p3;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div10 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			t0 = text("We’ve funded ");
    			span0 = element("span");
    			span0.textContent = "120,00 charity projects";
    			t2 = text(" for ");
    			br0 = element("br");
    			t3 = text(" 20M people\r\n\t\t\t\t\taround the world.");
    			t4 = space();
    			div9 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			span1 = element("span");
    			t5 = space();
    			h50 = element("h5");
    			t6 = text("Pure Water ");
    			br1 = element("br");
    			t7 = text("For Poor People");
    			t8 = space();
    			p0 = element("p");
    			p0.textContent = "663 million people drink dirty water. Learn how access to clean water can improve health,\r\n\t\t\t\t\t\t\tboost local economies.";
    			t10 = space();
    			div4 = element("div");
    			div3 = element("div");
    			span2 = element("span");
    			t11 = space();
    			h51 = element("h5");
    			t12 = text("Healty Food ");
    			br2 = element("br");
    			t13 = text("For Poor People");
    			t14 = space();
    			p1 = element("p");
    			p1.textContent = "663 million people drink dirty water. Learn how access to clean water can improve health,\r\n\t\t\t\t\t\t\tboost local economies.";
    			t16 = space();
    			div6 = element("div");
    			div5 = element("div");
    			span3 = element("span");
    			t17 = space();
    			h52 = element("h5");
    			t18 = text("Medical ");
    			br3 = element("br");
    			t19 = text("Facilities for People");
    			t20 = space();
    			p2 = element("p");
    			p2.textContent = "663 million people drink dirty water. Learn how access to clean water can improve health,\r\n\t\t\t\t\t\t\tboost local economies.";
    			t22 = space();
    			div8 = element("div");
    			div7 = element("div");
    			span4 = element("span");
    			t23 = space();
    			h53 = element("h5");
    			t24 = text("Pure Education ");
    			br4 = element("br");
    			t25 = text("For Every Children");
    			t26 = space();
    			p3 = element("p");
    			p3.textContent = "663 million people drink dirty water. Learn how access to clean water can improve health,\r\n\t\t\t\t\t\t\tboost local economies.";
    			add_location(span0, file$5, 4, 46, 201);
    			add_location(br0, file$5, 4, 87, 242);
    			attr_dev(h2, "class", "xs-mb-0 xs-title");
    			add_location(h2, file$5, 4, 4, 159);
    			attr_dev(div0, "class", "xs-heading xs-mb-70 text-center");
    			add_location(div0, file$5, 3, 3, 108);
    			attr_dev(span1, "class", "icon-water");
    			add_location(span1, file$5, 10, 6, 401);
    			add_location(br1, file$5, 11, 21, 456);
    			add_location(h50, file$5, 11, 6, 441);
    			add_location(p0, file$5, 12, 6, 488);
    			attr_dev(div1, "class", "xs-service-promo");
    			add_location(div1, file$5, 9, 5, 363);
    			attr_dev(div2, "class", "col-md-6 col-lg-3");
    			add_location(div2, file$5, 8, 4, 325);
    			attr_dev(span2, "class", "icon-groceries");
    			add_location(span2, file$5, 18, 6, 752);
    			add_location(br2, file$5, 19, 22, 812);
    			add_location(h51, file$5, 19, 6, 796);
    			add_location(p1, file$5, 20, 6, 844);
    			attr_dev(div3, "class", "xs-service-promo");
    			add_location(div3, file$5, 17, 5, 714);
    			attr_dev(div4, "class", "col-md-6 col-lg-3");
    			add_location(div4, file$5, 16, 4, 676);
    			attr_dev(span3, "class", "icon-heartbeat");
    			add_location(span3, file$5, 26, 6, 1108);
    			add_location(br3, file$5, 27, 18, 1164);
    			add_location(h52, file$5, 27, 6, 1152);
    			add_location(p2, file$5, 28, 6, 1202);
    			attr_dev(div5, "class", "xs-service-promo");
    			add_location(div5, file$5, 25, 5, 1070);
    			attr_dev(div6, "class", "col-md-6 col-lg-3");
    			add_location(div6, file$5, 24, 4, 1032);
    			attr_dev(span4, "class", "icon-open-book");
    			add_location(span4, file$5, 34, 6, 1466);
    			add_location(br4, file$5, 35, 25, 1529);
    			add_location(h53, file$5, 35, 6, 1510);
    			add_location(p3, file$5, 36, 6, 1564);
    			attr_dev(div7, "class", "xs-service-promo");
    			add_location(div7, file$5, 33, 5, 1428);
    			attr_dev(div8, "class", "col-md-6 col-lg-3");
    			add_location(div8, file$5, 32, 4, 1390);
    			attr_dev(div9, "class", "row");
    			add_location(div9, file$5, 7, 3, 302);
    			attr_dev(div10, "class", "container");
    			add_location(div10, file$5, 2, 2, 80);
    			attr_dev(section, "class", "xs-section-padding");
    			add_location(section, file$5, 1, 1, 40);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div10);
    			append_dev(div10, div0);
    			append_dev(div0, h2);
    			append_dev(h2, t0);
    			append_dev(h2, span0);
    			append_dev(h2, t2);
    			append_dev(h2, br0);
    			append_dev(h2, t3);
    			append_dev(div10, t4);
    			append_dev(div10, div9);
    			append_dev(div9, div2);
    			append_dev(div2, div1);
    			append_dev(div1, span1);
    			append_dev(div1, t5);
    			append_dev(div1, h50);
    			append_dev(h50, t6);
    			append_dev(h50, br1);
    			append_dev(h50, t7);
    			append_dev(div1, t8);
    			append_dev(div1, p0);
    			append_dev(div9, t10);
    			append_dev(div9, div4);
    			append_dev(div4, div3);
    			append_dev(div3, span2);
    			append_dev(div3, t11);
    			append_dev(div3, h51);
    			append_dev(h51, t12);
    			append_dev(h51, br2);
    			append_dev(h51, t13);
    			append_dev(div3, t14);
    			append_dev(div3, p1);
    			append_dev(div9, t16);
    			append_dev(div9, div6);
    			append_dev(div6, div5);
    			append_dev(div5, span3);
    			append_dev(div5, t17);
    			append_dev(div5, h52);
    			append_dev(h52, t18);
    			append_dev(h52, br3);
    			append_dev(h52, t19);
    			append_dev(div5, t20);
    			append_dev(div5, p2);
    			append_dev(div9, t22);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, span4);
    			append_dev(div7, t23);
    			append_dev(div7, h53);
    			append_dev(h53, t24);
    			append_dev(h53, br4);
    			append_dev(h53, t25);
    			append_dev(div7, t26);
    			append_dev(div7, p3);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Promo', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Promo> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Promo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init$1(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Promo",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src\components\Footer.svelte generated by Svelte v3.46.4 */

    const file$4 = "src\\components\\Footer.svelte";

    function create_fragment$6(ctx) {
    	let footer;
    	let div5;
    	let div4;
    	let div3;
    	let div0;
    	let a0;
    	let img;
    	let img_src_value;
    	let t0;
    	let p0;
    	let t2;
    	let ul0;
    	let li0;
    	let a1;
    	let i0;
    	let t3;
    	let li1;
    	let a2;
    	let i1;
    	let t4;
    	let li2;
    	let a3;
    	let i2;
    	let t5;
    	let li3;
    	let a4;
    	let i3;
    	let t6;
    	let div1;
    	let h30;
    	let t8;
    	let ul1;
    	let li4;
    	let a5;
    	let t10;
    	let li5;
    	let a6;
    	let t12;
    	let li6;
    	let a7;
    	let t14;
    	let li7;
    	let a8;
    	let t16;
    	let li8;
    	let a9;
    	let t18;
    	let li9;
    	let a10;
    	let t20;
    	let div2;
    	let h31;
    	let t22;
    	let ul2;
    	let li10;
    	let i4;
    	let t23;
    	let t24;
    	let li11;
    	let i5;
    	let t25;
    	let t26;
    	let li12;
    	let i6;
    	let a11;
    	let t28;
    	let div11;
    	let div10;
    	let div9;
    	let div7;
    	let div6;
    	let p1;
    	let t30;
    	let div8;
    	let nav;
    	let ul3;
    	let li13;
    	let a12;
    	let t32;
    	let li14;
    	let a13;
    	let t34;
    	let li15;
    	let a14;
    	let t36;
    	let div12;
    	let a15;
    	let i7;

    	const block = {
    		c: function create() {
    			footer = element("footer");
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			a0 = element("a");
    			img = element("img");
    			t0 = space();
    			p0 = element("p");
    			p0.textContent = "CharityPress online and raise money for charity and causes you’re passionate about.\r\n                        CharityPress is an innovative, cost-effective online.";
    			t2 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			a1 = element("a");
    			i0 = element("i");
    			t3 = space();
    			li1 = element("li");
    			a2 = element("a");
    			i1 = element("i");
    			t4 = space();
    			li2 = element("li");
    			a3 = element("a");
    			i2 = element("i");
    			t5 = space();
    			li3 = element("li");
    			a4 = element("a");
    			i3 = element("i");
    			t6 = space();
    			div1 = element("div");
    			h30 = element("h3");
    			h30.textContent = "About Us";
    			t8 = space();
    			ul1 = element("ul");
    			li4 = element("li");
    			a5 = element("a");
    			a5.textContent = "About employee";
    			t10 = space();
    			li5 = element("li");
    			a6 = element("a");
    			a6.textContent = "How it works";
    			t12 = space();
    			li6 = element("li");
    			a7 = element("a");
    			a7.textContent = "Careers";
    			t14 = space();
    			li7 = element("li");
    			a8 = element("a");
    			a8.textContent = "Press";
    			t16 = space();
    			li8 = element("li");
    			a9 = element("a");
    			a9.textContent = "Blog";
    			t18 = space();
    			li9 = element("li");
    			a10 = element("a");
    			a10.textContent = "Contact";
    			t20 = space();
    			div2 = element("div");
    			h31 = element("h3");
    			h31.textContent = "Contact Us";
    			t22 = space();
    			ul2 = element("ul");
    			li10 = element("li");
    			i4 = element("i");
    			t23 = text("Sector # 48, 123 Street, miosya road VIC 28, Australia.");
    			t24 = space();
    			li11 = element("li");
    			i5 = element("i");
    			t25 = text("(800) 123.456.7890 (800) 123.456.7890 +00 99 88 5647");
    			t26 = space();
    			li12 = element("li");
    			i6 = element("i");
    			a11 = element("a");
    			a11.textContent = "yourname@domain.com";
    			t28 = space();
    			div11 = element("div");
    			div10 = element("div");
    			div9 = element("div");
    			div7 = element("div");
    			div6 = element("div");
    			p1 = element("p");
    			p1.textContent = "© Copyright 2018 Charity. - All Right's Reserved";
    			t30 = space();
    			div8 = element("div");
    			nav = element("nav");
    			ul3 = element("ul");
    			li13 = element("li");
    			a12 = element("a");
    			a12.textContent = "FAQ";
    			t32 = space();
    			li14 = element("li");
    			a13 = element("a");
    			a13.textContent = "Help Desk";
    			t34 = space();
    			li15 = element("li");
    			a14 = element("a");
    			a14.textContent = "Support";
    			t36 = space();
    			div12 = element("div");
    			a15 = element("a");
    			i7 = element("i");
    			if (!src_url_equal(img.src, img_src_value = "/assets/images/footer_logo.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			add_location(img, file$4, 7, 24, 323);
    			attr_dev(a0, "href", "/");
    			attr_dev(a0, "class", "xs-footer-logo");
    			add_location(a0, file$4, 6, 20, 262);
    			add_location(p0, file$4, 9, 20, 420);
    			attr_dev(i0, "class", "fa fa-facebook");
    			add_location(i0, file$4, 12, 62, 705);
    			attr_dev(a1, "href", "");
    			attr_dev(a1, "class", "color-facebook");
    			add_location(a1, file$4, 12, 28, 671);
    			add_location(li0, file$4, 12, 24, 667);
    			attr_dev(i1, "class", "fa fa-twitter");
    			add_location(i1, file$4, 13, 61, 807);
    			attr_dev(a2, "href", "");
    			attr_dev(a2, "class", "color-twitter");
    			add_location(a2, file$4, 13, 28, 774);
    			add_location(li1, file$4, 13, 24, 770);
    			attr_dev(i2, "class", "fa fa-dribbble");
    			add_location(i2, file$4, 14, 62, 909);
    			attr_dev(a3, "href", "");
    			attr_dev(a3, "class", "color-dribbble");
    			add_location(a3, file$4, 14, 28, 875);
    			add_location(li2, file$4, 14, 24, 871);
    			attr_dev(i3, "class", "fa fa-pinterest");
    			add_location(i3, file$4, 15, 63, 1013);
    			attr_dev(a4, "href", "");
    			attr_dev(a4, "class", "color-pinterest");
    			add_location(a4, file$4, 15, 28, 978);
    			add_location(li3, file$4, 15, 24, 974);
    			attr_dev(ul0, "class", "xs-social-list-v2");
    			add_location(ul0, file$4, 11, 20, 611);
    			attr_dev(div0, "class", "col-lg-3 col-md-6 footer-widget xs-pr-20");
    			add_location(div0, file$4, 5, 16, 186);
    			attr_dev(h30, "class", "widget-title");
    			add_location(h30, file$4, 19, 20, 1217);
    			attr_dev(a5, "href", "/");
    			add_location(a5, file$4, 21, 28, 1334);
    			add_location(li4, file$4, 21, 24, 1330);
    			attr_dev(a6, "href", "#");
    			add_location(a6, file$4, 22, 28, 1399);
    			add_location(li5, file$4, 22, 24, 1395);
    			attr_dev(a7, "href", "#");
    			add_location(a7, file$4, 23, 28, 1462);
    			add_location(li6, file$4, 23, 24, 1458);
    			attr_dev(a8, "href", "#");
    			add_location(a8, file$4, 24, 28, 1520);
    			add_location(li7, file$4, 24, 24, 1516);
    			attr_dev(a9, "href", "#");
    			add_location(a9, file$4, 25, 28, 1576);
    			add_location(li8, file$4, 25, 24, 1572);
    			attr_dev(a10, "href", "/contact");
    			add_location(a10, file$4, 26, 28, 1631);
    			add_location(li9, file$4, 26, 24, 1627);
    			attr_dev(ul1, "class", "xs-footer-list");
    			add_location(ul1, file$4, 20, 20, 1277);
    			attr_dev(div1, "class", "col-lg-4 col-md-6 footer-widget");
    			add_location(div1, file$4, 18, 16, 1150);
    			attr_dev(h31, "class", "widget-title");
    			add_location(h31, file$4, 30, 20, 1802);
    			attr_dev(i4, "class", "fa fa-home");
    			add_location(i4, file$4, 32, 28, 1919);
    			add_location(li10, file$4, 32, 24, 1915);
    			attr_dev(i5, "class", "fa fa-phone");
    			add_location(i5, file$4, 33, 28, 2035);
    			add_location(li11, file$4, 33, 24, 2031);
    			attr_dev(i6, "class", "fa fa-envelope-o");
    			add_location(i6, file$4, 34, 28, 2149);
    			attr_dev(a11, "href", "mailto:yourname@domain.com");
    			add_location(a11, file$4, 34, 60, 2181);
    			add_location(li12, file$4, 34, 24, 2145);
    			attr_dev(ul2, "class", "xs-info-list");
    			add_location(ul2, file$4, 31, 20, 1864);
    			attr_dev(div2, "class", "col-lg-4 col-md-6 footer-widget");
    			add_location(div2, file$4, 29, 16, 1735);
    			attr_dev(div3, "class", "row");
    			add_location(div3, file$4, 4, 12, 151);
    			attr_dev(div4, "class", "xs-footer-top-layer");
    			add_location(div4, file$4, 3, 8, 104);
    			attr_dev(div5, "class", "container");
    			add_location(div5, file$4, 2, 4, 71);
    			add_location(p1, file$4, 46, 24, 2624);
    			attr_dev(div6, "class", "xs-copyright-text");
    			add_location(div6, file$4, 45, 20, 2567);
    			attr_dev(div7, "class", "col-md-6");
    			add_location(div7, file$4, 44, 16, 2523);
    			attr_dev(a12, "href", "#");
    			add_location(a12, file$4, 52, 32, 2890);
    			add_location(li13, file$4, 52, 28, 2886);
    			attr_dev(a13, "href", "#");
    			add_location(a13, file$4, 53, 32, 2948);
    			add_location(li14, file$4, 53, 28, 2944);
    			attr_dev(a14, "href", "#");
    			add_location(a14, file$4, 54, 32, 3012);
    			add_location(li15, file$4, 54, 28, 3008);
    			add_location(ul3, file$4, 51, 24, 2852);
    			attr_dev(nav, "class", "xs-footer-menu");
    			add_location(nav, file$4, 50, 20, 2798);
    			attr_dev(div8, "class", "col-md-6");
    			add_location(div8, file$4, 49, 16, 2754);
    			attr_dev(div9, "class", "row");
    			add_location(div9, file$4, 43, 12, 2488);
    			attr_dev(div10, "class", "xs-copyright");
    			add_location(div10, file$4, 42, 8, 2448);
    			attr_dev(div11, "class", "container");
    			add_location(div11, file$4, 41, 4, 2415);
    			attr_dev(i7, "class", "fa fa-angle-up");
    			add_location(i7, file$4, 62, 43, 3257);
    			attr_dev(a15, "href", "#");
    			attr_dev(a15, "class", "xs-back-to-top");
    			add_location(a15, file$4, 62, 8, 3222);
    			attr_dev(div12, "class", "xs-back-to-top-wraper");
    			add_location(div12, file$4, 61, 4, 3177);
    			attr_dev(footer, "class", "xs-footer-section");
    			add_location(footer, file$4, 1, 0, 31);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, footer, anchor);
    			append_dev(footer, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			append_dev(div0, a0);
    			append_dev(a0, img);
    			append_dev(div0, t0);
    			append_dev(div0, p0);
    			append_dev(div0, t2);
    			append_dev(div0, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, a1);
    			append_dev(a1, i0);
    			append_dev(ul0, t3);
    			append_dev(ul0, li1);
    			append_dev(li1, a2);
    			append_dev(a2, i1);
    			append_dev(ul0, t4);
    			append_dev(ul0, li2);
    			append_dev(li2, a3);
    			append_dev(a3, i2);
    			append_dev(ul0, t5);
    			append_dev(ul0, li3);
    			append_dev(li3, a4);
    			append_dev(a4, i3);
    			append_dev(div3, t6);
    			append_dev(div3, div1);
    			append_dev(div1, h30);
    			append_dev(div1, t8);
    			append_dev(div1, ul1);
    			append_dev(ul1, li4);
    			append_dev(li4, a5);
    			append_dev(ul1, t10);
    			append_dev(ul1, li5);
    			append_dev(li5, a6);
    			append_dev(ul1, t12);
    			append_dev(ul1, li6);
    			append_dev(li6, a7);
    			append_dev(ul1, t14);
    			append_dev(ul1, li7);
    			append_dev(li7, a8);
    			append_dev(ul1, t16);
    			append_dev(ul1, li8);
    			append_dev(li8, a9);
    			append_dev(ul1, t18);
    			append_dev(ul1, li9);
    			append_dev(li9, a10);
    			append_dev(div3, t20);
    			append_dev(div3, div2);
    			append_dev(div2, h31);
    			append_dev(div2, t22);
    			append_dev(div2, ul2);
    			append_dev(ul2, li10);
    			append_dev(li10, i4);
    			append_dev(li10, t23);
    			append_dev(ul2, t24);
    			append_dev(ul2, li11);
    			append_dev(li11, i5);
    			append_dev(li11, t25);
    			append_dev(ul2, t26);
    			append_dev(ul2, li12);
    			append_dev(li12, i6);
    			append_dev(li12, a11);
    			append_dev(footer, t28);
    			append_dev(footer, div11);
    			append_dev(div11, div10);
    			append_dev(div10, div9);
    			append_dev(div9, div7);
    			append_dev(div7, div6);
    			append_dev(div6, p1);
    			append_dev(div9, t30);
    			append_dev(div9, div8);
    			append_dev(div8, nav);
    			append_dev(nav, ul3);
    			append_dev(ul3, li13);
    			append_dev(li13, a12);
    			append_dev(ul3, t32);
    			append_dev(ul3, li14);
    			append_dev(li14, a13);
    			append_dev(ul3, t34);
    			append_dev(ul3, li15);
    			append_dev(li15, a14);
    			append_dev(footer, t36);
    			append_dev(footer, div12);
    			append_dev(div12, a15);
    			append_dev(a15, i7);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Footer', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init$1(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    var charities = {
        charities: [
            {
                id: 1,
                title: 'First charity project',
                category: 'Money',
                thumbnail:'/assets/images/money.jpg',
                pledged: 90000,
                target: 100000,
                date_end: +new Date('10 august 2022'),
                profile_photo:'https://live.staticflickr.com/4027/4357722810_7136f4a9e9_s.jpg',
                profile_name:'Viroide Bueno',
                no_pledges: 0
            }
        ]
    };

    /* src\pages\Home.svelte generated by Svelte v3.46.4 */

    function create_fragment$5(ctx) {
    	let header;
    	let t0;
    	let welcome;
    	let t1;
    	let charitylist;
    	let t2;
    	let promo;
    	let t3;
    	let footer;
    	let current;
    	header = new Header({ $$inline: true });
    	welcome = new Welcome({ $$inline: true });
    	charitylist = new CharityList({ props: { charities: charities.charities }, $$inline: true });
    	promo = new Promo({ $$inline: true });
    	footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(header.$$.fragment);
    			t0 = space();
    			create_component(welcome.$$.fragment);
    			t1 = space();
    			create_component(charitylist.$$.fragment);
    			t2 = space();
    			create_component(promo.$$.fragment);
    			t3 = space();
    			create_component(footer.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(header, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(welcome, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(charitylist, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(promo, target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(footer, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(welcome.$$.fragment, local);
    			transition_in(charitylist.$$.fragment, local);
    			transition_in(promo.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(welcome.$$.fragment, local);
    			transition_out(charitylist.$$.fragment, local);
    			transition_out(promo.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(header, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(welcome, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(charitylist, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(promo, detaching);
    			if (detaching) detach_dev(t3);
    			destroy_component(footer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Home', slots, []);
    	let title = "Charity";
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		CharityList,
    		Header,
    		Welcome,
    		Promo,
    		Footer,
    		charities: charities.charities,
    		title
    	});

    	$$self.$inject_state = $$props => {
    		if ('title' in $$props) title = $$props.title;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init$1(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\pages\About.svelte generated by Svelte v3.46.4 */
    const file$3 = "src\\pages\\About.svelte";

    function create_fragment$4(ctx) {
    	let header;
    	let t0;
    	let section0;
    	let div0;
    	let t1;
    	let div2;
    	let div1;
    	let h20;
    	let t3;
    	let p0;
    	let t5;
    	let ul0;
    	let li0;
    	let a0;
    	let t7;
    	let t8;
    	let main;
    	let div8;
    	let div7;
    	let div6;
    	let div5;
    	let div4;
    	let img;
    	let img_src_value;
    	let t9;
    	let div3;
    	let a1;
    	let i0;
    	let t10;
    	let section1;
    	let div19;
    	let div11;
    	let div10;
    	let div9;
    	let h21;
    	let t11;
    	let span0;
    	let t13;
    	let t14;
    	let div18;
    	let div13;
    	let div12;
    	let h30;
    	let t16;
    	let p1;
    	let t18;
    	let div15;
    	let div14;
    	let h31;
    	let t20;
    	let p2;
    	let t22;
    	let div17;
    	let div16;
    	let h32;
    	let t24;
    	let ul1;
    	let li1;
    	let t26;
    	let li2;
    	let t28;
    	let li3;
    	let t30;
    	let li4;
    	let t32;
    	let div32;
    	let div30;
    	let div20;
    	let h22;
    	let t34;
    	let div29;
    	let div22;
    	let div21;
    	let i1;
    	let t35;
    	let span1;
    	let span2;
    	let t38;
    	let small0;
    	let t40;
    	let div24;
    	let div23;
    	let i2;
    	let t41;
    	let span3;
    	let span4;
    	let t44;
    	let small1;
    	let t46;
    	let div26;
    	let div25;
    	let i3;
    	let t47;
    	let span5;
    	let span6;
    	let t50;
    	let small2;
    	let t52;
    	let div28;
    	let div27;
    	let i4;
    	let t53;
    	let span7;
    	let span8;
    	let t56;
    	let small3;
    	let t58;
    	let div31;
    	let t59;
    	let section2;
    	let div44;
    	let div34;
    	let div33;
    	let h23;
    	let t61;
    	let span9;
    	let t62;
    	let p3;
    	let t64;
    	let div43;
    	let div36;
    	let div35;
    	let span10;
    	let t65;
    	let h50;
    	let t66;
    	let br0;
    	let t67;
    	let t68;
    	let p4;
    	let t70;
    	let div38;
    	let div37;
    	let span11;
    	let t71;
    	let h51;
    	let t72;
    	let br1;
    	let t73;
    	let t74;
    	let p5;
    	let t76;
    	let div40;
    	let div39;
    	let span12;
    	let t77;
    	let h52;
    	let t78;
    	let br2;
    	let t79;
    	let t80;
    	let p6;
    	let t82;
    	let div42;
    	let div41;
    	let span13;
    	let t83;
    	let h53;
    	let t84;
    	let br3;
    	let t85;
    	let t86;
    	let p7;
    	let t88;
    	let footer;
    	let current;
    	header = new Header({ $$inline: true });
    	footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(header.$$.fragment);
    			t0 = space();
    			section0 = element("section");
    			div0 = element("div");
    			t1 = space();
    			div2 = element("div");
    			div1 = element("div");
    			h20 = element("h2");
    			h20.textContent = "About Us";
    			t3 = space();
    			p0 = element("p");
    			p0.textContent = "Give a helping hand for poor people";
    			t5 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			a0.textContent = "Home /";
    			t7 = text(" About");
    			t8 = space();
    			main = element("main");
    			div8 = element("div");
    			div7 = element("div");
    			div6 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			img = element("img");
    			t9 = space();
    			div3 = element("div");
    			a1 = element("a");
    			i0 = element("i");
    			t10 = space();
    			section1 = element("section");
    			div19 = element("div");
    			div11 = element("div");
    			div10 = element("div");
    			div9 = element("div");
    			h21 = element("h2");
    			t11 = text("We are an Globian non-profit organization that ");
    			span0 = element("span");
    			span0.textContent = "supports";
    			t13 = text(" good causes and positive change all over the world.");
    			t14 = space();
    			div18 = element("div");
    			div13 = element("div");
    			div12 = element("div");
    			h30 = element("h3");
    			h30.textContent = "Our Mission";
    			t16 = space();
    			p1 = element("p");
    			p1.textContent = "The CharityPress community was named a “Top 25 Best Global Philanthropist” by Barron’s. We beat Oprah. And, Mashable named CharityPress something like that.";
    			t18 = space();
    			div15 = element("div");
    			div14 = element("div");
    			h31 = element("h3");
    			h31.textContent = "Our Vission";
    			t20 = space();
    			p2 = element("p");
    			p2.textContent = "The Globian Fund for Charities seeks positive change around the world through support of non-profit organizations dedicated to social, cultural.";
    			t22 = space();
    			div17 = element("div");
    			div16 = element("div");
    			h32 = element("h3");
    			h32.textContent = "Our Values";
    			t24 = space();
    			ul1 = element("ul");
    			li1 = element("li");
    			li1.textContent = "Accountability";
    			t26 = space();
    			li2 = element("li");
    			li2.textContent = "Reliability";
    			t28 = space();
    			li3 = element("li");
    			li3.textContent = "Cost-effectiveness";
    			t30 = space();
    			li4 = element("li");
    			li4.textContent = "Personal service";
    			t32 = space();
    			div32 = element("div");
    			div30 = element("div");
    			div20 = element("div");
    			h22 = element("h2");
    			h22.textContent = "Our agency has been present for over 30 years. We make the best for all our children.";
    			t34 = space();
    			div29 = element("div");
    			div22 = element("div");
    			div21 = element("div");
    			i1 = element("i");
    			t35 = space();
    			span1 = element("span");
    			span1.textContent = "0";
    			span2 = element("span");
    			span2.textContent = "M";
    			t38 = space();
    			small0 = element("small");
    			small0.textContent = "Causes";
    			t40 = space();
    			div24 = element("div");
    			div23 = element("div");
    			i2 = element("i");
    			t41 = space();
    			span3 = element("span");
    			span3.textContent = "0";
    			span4 = element("span");
    			span4.textContent = "k";
    			t44 = space();
    			small1 = element("small");
    			small1.textContent = "Valunteer";
    			t46 = space();
    			div26 = element("div");
    			div25 = element("div");
    			i3 = element("i");
    			t47 = space();
    			span5 = element("span");
    			span5.textContent = "0";
    			span6 = element("span");
    			span6.textContent = "k";
    			t50 = space();
    			small2 = element("small");
    			small2.textContent = "Childrens";
    			t52 = space();
    			div28 = element("div");
    			div27 = element("div");
    			i4 = element("i");
    			t53 = space();
    			span7 = element("span");
    			span7.textContent = "0";
    			span8 = element("span");
    			span8.textContent = "k";
    			t56 = space();
    			small3 = element("small");
    			small3.textContent = "Countrys";
    			t58 = space();
    			div31 = element("div");
    			t59 = space();
    			section2 = element("section");
    			div44 = element("div");
    			div34 = element("div");
    			div33 = element("div");
    			h23 = element("h2");
    			h23.textContent = "What We Do";
    			t61 = space();
    			span9 = element("span");
    			t62 = space();
    			p3 = element("p");
    			p3.textContent = "It allows you to gather monthly subscriptions from fans to help fund your creative projects. They also encourage their users to offer rewards to fans as a way to repay them for their support.";
    			t64 = space();
    			div43 = element("div");
    			div36 = element("div");
    			div35 = element("div");
    			span10 = element("span");
    			t65 = space();
    			h50 = element("h5");
    			t66 = text("Pure Water ");
    			br0 = element("br");
    			t67 = text("For Poor People");
    			t68 = space();
    			p4 = element("p");
    			p4.textContent = "663 million people drink dirty water. Learn how access to clean water can improve health, boost local economies.";
    			t70 = space();
    			div38 = element("div");
    			div37 = element("div");
    			span11 = element("span");
    			t71 = space();
    			h51 = element("h5");
    			t72 = text("Healty Food ");
    			br1 = element("br");
    			t73 = text("For Poor People");
    			t74 = space();
    			p5 = element("p");
    			p5.textContent = "663 million people drink dirty water. Learn how access to clean water can improve health, boost local economies.";
    			t76 = space();
    			div40 = element("div");
    			div39 = element("div");
    			span12 = element("span");
    			t77 = space();
    			h52 = element("h5");
    			t78 = text("Medical ");
    			br2 = element("br");
    			t79 = text("Facilities for People");
    			t80 = space();
    			p6 = element("p");
    			p6.textContent = "663 million people drink dirty water. Learn how access to clean water can improve health, boost local economies.";
    			t82 = space();
    			div42 = element("div");
    			div41 = element("div");
    			span13 = element("span");
    			t83 = space();
    			h53 = element("h5");
    			t84 = text("Pure Education ");
    			br3 = element("br");
    			t85 = text("For Every Children");
    			t86 = space();
    			p7 = element("p");
    			p7.textContent = "663 million people drink dirty water. Learn how access to clean water can improve health, boost local economies.";
    			t88 = space();
    			create_component(footer.$$.fragment);
    			attr_dev(div0, "class", "xs-black-overlay");
    			add_location(div0, file$3, 10, 1, 319);
    			add_location(h20, file$3, 13, 3, 439);
    			add_location(p0, file$3, 14, 3, 461);
    			attr_dev(a0, "href", "index.html");
    			attr_dev(a0, "class", "color-white");
    			add_location(a0, file$3, 16, 47, 582);
    			attr_dev(li0, "class", "badge badge-pill badge-primary");
    			add_location(li0, file$3, 16, 4, 539);
    			attr_dev(ul0, "class", "xs-breadcumb");
    			add_location(ul0, file$3, 15, 3, 508);
    			attr_dev(div1, "class", "color-white xs-inner-banner-content");
    			add_location(div1, file$3, 12, 2, 385);
    			attr_dev(div2, "class", "container");
    			add_location(div2, file$3, 11, 1, 358);
    			attr_dev(section0, "class", "xs-banner-inner-section parallax-window");
    			set_style(section0, "background-image", "url('assets/images/about_bg.png')");
    			add_location(section0, file$3, 9, 0, 200);
    			if (!src_url_equal(img.src, img_src_value = "assets/images/video_img.jpg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			add_location(img, file$3, 32, 5, 986);
    			attr_dev(i0, "class", "fa fa-play");
    			add_location(i0, file$3, 35, 7, 1182);
    			attr_dev(a1, "href", "https://www.youtube.com/watch?v=Tb1HsAGy-ls");
    			attr_dev(a1, "class", "xs-video-popup xs-round-btn");
    			add_location(a1, file$3, 34, 6, 1083);
    			attr_dev(div3, "class", "xs-video-popup-content");
    			add_location(div3, file$3, 33, 5, 1039);
    			attr_dev(div4, "class", "xs-video-popup-wraper");
    			add_location(div4, file$3, 31, 4, 944);
    			attr_dev(div5, "class", "col-lg-8 content-center");
    			add_location(div5, file$3, 30, 3, 901);
    			attr_dev(div6, "class", "row");
    			add_location(div6, file$3, 29, 2, 879);
    			attr_dev(div7, "class", "container");
    			add_location(div7, file$3, 28, 1, 852);
    			attr_dev(div8, "class", "xs-video-popup-section");
    			add_location(div8, file$3, 27, 1, 813);
    			attr_dev(span0, "class", "color-green");
    			add_location(span0, file$3, 50, 81, 1748);
    			attr_dev(h21, "class", "xs-mb-0 xs-title");
    			add_location(h21, file$3, 50, 5, 1672);
    			attr_dev(div9, "class", "xs-heading xs-mb-100 text-center");
    			add_location(div9, file$3, 49, 4, 1619);
    			attr_dev(div10, "class", "col-lg-11 content-center");
    			add_location(div10, file$3, 48, 3, 1575);
    			attr_dev(div11, "class", "row");
    			add_location(div11, file$3, 47, 2, 1553);
    			add_location(h30, file$3, 57, 5, 1987);
    			attr_dev(p1, "class", "lead");
    			add_location(p1, file$3, 58, 5, 2014);
    			attr_dev(div12, "class", "xs-about-feature");
    			add_location(div12, file$3, 56, 4, 1950);
    			attr_dev(div13, "class", "col-md-4");
    			add_location(div13, file$3, 55, 3, 1922);
    			add_location(h31, file$3, 63, 5, 2283);
    			attr_dev(p2, "class", "lead");
    			add_location(p2, file$3, 64, 5, 2310);
    			attr_dev(div14, "class", "xs-about-feature");
    			add_location(div14, file$3, 62, 4, 2246);
    			attr_dev(div15, "class", "col-md-4");
    			add_location(div15, file$3, 61, 3, 2218);
    			add_location(h32, file$3, 69, 5, 2567);
    			add_location(li1, file$3, 71, 6, 2645);
    			add_location(li2, file$3, 72, 6, 2676);
    			add_location(li3, file$3, 73, 6, 2704);
    			add_location(li4, file$3, 74, 6, 2739);
    			attr_dev(ul1, "class", "xs-unorder-list play green-icon");
    			add_location(ul1, file$3, 70, 5, 2593);
    			attr_dev(div16, "class", "xs-about-feature");
    			add_location(div16, file$3, 68, 4, 2530);
    			attr_dev(div17, "class", "col-md-4");
    			add_location(div17, file$3, 67, 3, 2502);
    			attr_dev(div18, "class", "row");
    			add_location(div18, file$3, 54, 2, 1900);
    			attr_dev(div19, "class", "container");
    			add_location(div19, file$3, 46, 1, 1526);
    			attr_dev(section1, "class", "xs-content-section-padding");
    			add_location(section1, file$3, 45, 1, 1479);
    			attr_dev(h22, "class", "xs-title color-white small");
    			add_location(h22, file$3, 86, 3, 3190);
    			attr_dev(div20, "class", "row col-lg-10 xs-heading mx-auto");
    			add_location(div20, file$3, 85, 2, 3139);
    			attr_dev(i1, "class", "icon-donation_2");
    			add_location(i1, file$3, 91, 5, 3442);
    			attr_dev(span1, "class", "number-percentage-count number-percentage");
    			attr_dev(span1, "data-value", "10");
    			attr_dev(span1, "data-animation-duration", "3500");
    			add_location(span1, file$3, 92, 5, 3480);
    			add_location(span2, file$3, 92, 116, 3591);
    			add_location(small0, file$3, 93, 5, 3612);
    			attr_dev(div21, "class", "xs-single-funFact color-white");
    			add_location(div21, file$3, 90, 4, 3392);
    			attr_dev(div22, "class", "col-lg-3 col-md-6");
    			add_location(div22, file$3, 89, 3, 3355);
    			attr_dev(i2, "class", "icon-group");
    			add_location(i2, file$3, 98, 5, 3748);
    			attr_dev(span3, "class", "number-percentage-count number-percentage");
    			attr_dev(span3, "data-value", "25");
    			attr_dev(span3, "data-animation-duration", "3500");
    			add_location(span3, file$3, 99, 5, 3781);
    			add_location(span4, file$3, 99, 116, 3892);
    			add_location(small1, file$3, 100, 5, 3913);
    			attr_dev(div23, "class", "xs-single-funFact color-white");
    			add_location(div23, file$3, 97, 4, 3698);
    			attr_dev(div24, "class", "col-lg-3 col-md-6");
    			add_location(div24, file$3, 96, 3, 3661);
    			attr_dev(i3, "class", "icon-children");
    			add_location(i3, file$3, 105, 5, 4052);
    			attr_dev(span5, "class", "number-percentage-count number-percentage");
    			attr_dev(span5, "data-value", "30");
    			attr_dev(span5, "data-animation-duration", "3500");
    			add_location(span5, file$3, 106, 5, 4088);
    			add_location(span6, file$3, 106, 116, 4199);
    			add_location(small2, file$3, 107, 5, 4220);
    			attr_dev(div25, "class", "xs-single-funFact color-white");
    			add_location(div25, file$3, 104, 4, 4002);
    			attr_dev(div26, "class", "col-lg-3 col-md-6");
    			add_location(div26, file$3, 103, 3, 3965);
    			attr_dev(i4, "class", "icon-planet-earth");
    			add_location(i4, file$3, 112, 5, 4359);
    			attr_dev(span7, "class", "number-percentage-count number-percentage");
    			attr_dev(span7, "data-value", "14");
    			attr_dev(span7, "data-animation-duration", "3500");
    			add_location(span7, file$3, 113, 5, 4399);
    			add_location(span8, file$3, 113, 116, 4510);
    			add_location(small3, file$3, 114, 5, 4531);
    			attr_dev(div27, "class", "xs-single-funFact color-white");
    			add_location(div27, file$3, 111, 4, 4309);
    			attr_dev(div28, "class", "col-lg-3 col-md-6");
    			add_location(div28, file$3, 110, 3, 4272);
    			attr_dev(div29, "class", "row");
    			add_location(div29, file$3, 88, 2, 3333);
    			attr_dev(div30, "class", "container");
    			add_location(div30, file$3, 84, 1, 3112);
    			attr_dev(div31, "class", "xs-black-overlay");
    			add_location(div31, file$3, 119, 1, 4639);
    			attr_dev(div32, "class", "xs-funfact-section xs-content-section-padding waypoint-tigger parallax-window");
    			set_style(div32, "background-image", "url('assets/images/backgrounds/parallax_1.jpg')");
    			add_location(div32, file$3, 83, 1, 2944);
    			attr_dev(h23, "class", "xs-title");
    			add_location(h23, file$3, 127, 4, 4893);
    			attr_dev(span9, "class", "xs-separetor dashed");
    			add_location(span9, file$3, 128, 4, 4935);
    			add_location(p3, file$3, 129, 4, 4982);
    			attr_dev(div33, "class", "col-md-9 col-xl-9");
    			add_location(div33, file$3, 126, 3, 4856);
    			attr_dev(div34, "class", "xs-heading row xs-mb-60");
    			add_location(div34, file$3, 125, 2, 4814);
    			attr_dev(span10, "class", "icon-water color-orange");
    			add_location(span10, file$3, 135, 5, 5348);
    			add_location(br0, file$3, 136, 20, 5415);
    			add_location(h50, file$3, 136, 5, 5400);
    			add_location(p4, file$3, 137, 5, 5446);
    			attr_dev(div35, "class", "xs-service-promo");
    			add_location(div35, file$3, 134, 4, 5311);
    			attr_dev(div36, "class", "col-md-6 col-lg-3");
    			add_location(div36, file$3, 133, 3, 5274);
    			attr_dev(span11, "class", "icon-groceries color-red");
    			add_location(span11, file$3, 142, 5, 5697);
    			add_location(br1, file$3, 143, 21, 5766);
    			add_location(h51, file$3, 143, 5, 5750);
    			add_location(p5, file$3, 144, 5, 5797);
    			attr_dev(div37, "class", "xs-service-promo");
    			add_location(div37, file$3, 141, 4, 5660);
    			attr_dev(div38, "class", "col-md-6 col-lg-3");
    			add_location(div38, file$3, 140, 3, 5623);
    			attr_dev(span12, "class", "icon-heartbeat color-purple");
    			add_location(span12, file$3, 149, 5, 6048);
    			add_location(br2, file$3, 150, 17, 6116);
    			add_location(h52, file$3, 150, 5, 6104);
    			add_location(p6, file$3, 151, 5, 6153);
    			attr_dev(div39, "class", "xs-service-promo");
    			add_location(div39, file$3, 148, 4, 6011);
    			attr_dev(div40, "class", "col-md-6 col-lg-3");
    			add_location(div40, file$3, 147, 3, 5974);
    			attr_dev(span13, "class", "icon-open-book color-green");
    			add_location(span13, file$3, 156, 5, 6404);
    			add_location(br3, file$3, 157, 24, 6478);
    			add_location(h53, file$3, 157, 5, 6459);
    			add_location(p7, file$3, 158, 5, 6512);
    			attr_dev(div41, "class", "xs-service-promo");
    			add_location(div41, file$3, 155, 4, 6367);
    			attr_dev(div42, "class", "col-md-6 col-lg-3");
    			add_location(div42, file$3, 154, 3, 6330);
    			attr_dev(div43, "class", "row");
    			add_location(div43, file$3, 132, 2, 5252);
    			attr_dev(div44, "class", "container");
    			add_location(div44, file$3, 124, 1, 4787);
    			attr_dev(section2, "class", "xs-section-padding");
    			add_location(section2, file$3, 123, 1, 4748);
    			attr_dev(main, "class", "xs-main");
    			add_location(main, file$3, 25, 0, 749);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(header, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, section0, anchor);
    			append_dev(section0, div0);
    			append_dev(section0, t1);
    			append_dev(section0, div2);
    			append_dev(div2, div1);
    			append_dev(div1, h20);
    			append_dev(div1, t3);
    			append_dev(div1, p0);
    			append_dev(div1, t5);
    			append_dev(div1, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, a0);
    			append_dev(li0, t7);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div8);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, img);
    			append_dev(div4, t9);
    			append_dev(div4, div3);
    			append_dev(div3, a1);
    			append_dev(a1, i0);
    			append_dev(main, t10);
    			append_dev(main, section1);
    			append_dev(section1, div19);
    			append_dev(div19, div11);
    			append_dev(div11, div10);
    			append_dev(div10, div9);
    			append_dev(div9, h21);
    			append_dev(h21, t11);
    			append_dev(h21, span0);
    			append_dev(h21, t13);
    			append_dev(div19, t14);
    			append_dev(div19, div18);
    			append_dev(div18, div13);
    			append_dev(div13, div12);
    			append_dev(div12, h30);
    			append_dev(div12, t16);
    			append_dev(div12, p1);
    			append_dev(div18, t18);
    			append_dev(div18, div15);
    			append_dev(div15, div14);
    			append_dev(div14, h31);
    			append_dev(div14, t20);
    			append_dev(div14, p2);
    			append_dev(div18, t22);
    			append_dev(div18, div17);
    			append_dev(div17, div16);
    			append_dev(div16, h32);
    			append_dev(div16, t24);
    			append_dev(div16, ul1);
    			append_dev(ul1, li1);
    			append_dev(ul1, t26);
    			append_dev(ul1, li2);
    			append_dev(ul1, t28);
    			append_dev(ul1, li3);
    			append_dev(ul1, t30);
    			append_dev(ul1, li4);
    			append_dev(main, t32);
    			append_dev(main, div32);
    			append_dev(div32, div30);
    			append_dev(div30, div20);
    			append_dev(div20, h22);
    			append_dev(div30, t34);
    			append_dev(div30, div29);
    			append_dev(div29, div22);
    			append_dev(div22, div21);
    			append_dev(div21, i1);
    			append_dev(div21, t35);
    			append_dev(div21, span1);
    			append_dev(div21, span2);
    			append_dev(div21, t38);
    			append_dev(div21, small0);
    			append_dev(div29, t40);
    			append_dev(div29, div24);
    			append_dev(div24, div23);
    			append_dev(div23, i2);
    			append_dev(div23, t41);
    			append_dev(div23, span3);
    			append_dev(div23, span4);
    			append_dev(div23, t44);
    			append_dev(div23, small1);
    			append_dev(div29, t46);
    			append_dev(div29, div26);
    			append_dev(div26, div25);
    			append_dev(div25, i3);
    			append_dev(div25, t47);
    			append_dev(div25, span5);
    			append_dev(div25, span6);
    			append_dev(div25, t50);
    			append_dev(div25, small2);
    			append_dev(div29, t52);
    			append_dev(div29, div28);
    			append_dev(div28, div27);
    			append_dev(div27, i4);
    			append_dev(div27, t53);
    			append_dev(div27, span7);
    			append_dev(div27, span8);
    			append_dev(div27, t56);
    			append_dev(div27, small3);
    			append_dev(div32, t58);
    			append_dev(div32, div31);
    			append_dev(main, t59);
    			append_dev(main, section2);
    			append_dev(section2, div44);
    			append_dev(div44, div34);
    			append_dev(div34, div33);
    			append_dev(div33, h23);
    			append_dev(div33, t61);
    			append_dev(div33, span9);
    			append_dev(div33, t62);
    			append_dev(div33, p3);
    			append_dev(div44, t64);
    			append_dev(div44, div43);
    			append_dev(div43, div36);
    			append_dev(div36, div35);
    			append_dev(div35, span10);
    			append_dev(div35, t65);
    			append_dev(div35, h50);
    			append_dev(h50, t66);
    			append_dev(h50, br0);
    			append_dev(h50, t67);
    			append_dev(div35, t68);
    			append_dev(div35, p4);
    			append_dev(div43, t70);
    			append_dev(div43, div38);
    			append_dev(div38, div37);
    			append_dev(div37, span11);
    			append_dev(div37, t71);
    			append_dev(div37, h51);
    			append_dev(h51, t72);
    			append_dev(h51, br1);
    			append_dev(h51, t73);
    			append_dev(div37, t74);
    			append_dev(div37, p5);
    			append_dev(div43, t76);
    			append_dev(div43, div40);
    			append_dev(div40, div39);
    			append_dev(div39, span12);
    			append_dev(div39, t77);
    			append_dev(div39, h52);
    			append_dev(h52, t78);
    			append_dev(h52, br2);
    			append_dev(h52, t79);
    			append_dev(div39, t80);
    			append_dev(div39, p6);
    			append_dev(div43, t82);
    			append_dev(div43, div42);
    			append_dev(div42, div41);
    			append_dev(div41, span13);
    			append_dev(div41, t83);
    			append_dev(div41, h53);
    			append_dev(h53, t84);
    			append_dev(h53, br3);
    			append_dev(h53, t85);
    			append_dev(div41, t86);
    			append_dev(div41, p7);
    			insert_dev(target, t88, anchor);
    			mount_component(footer, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(header, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(section0);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(main);
    			if (detaching) detach_dev(t88);
    			destroy_component(footer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('About', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<About> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Header, Footer });
    	return [];
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init$1(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\pages\Contact.svelte generated by Svelte v3.46.4 */
    const file$2 = "src\\pages\\Contact.svelte";

    function create_fragment$3(ctx) {
    	let header;
    	let t0;
    	let section0;
    	let div0;
    	let t1;
    	let div2;
    	let div1;
    	let h2;
    	let t3;
    	let p;
    	let t5;
    	let ul;
    	let li;
    	let a;
    	let t7;
    	let t8;
    	let main;
    	let section1;
    	let div19;
    	let div18;
    	let div17;
    	let div13;
    	let div12;
    	let h4;
    	let t10;
    	let form;
    	let div5;
    	let input0;
    	let t11;
    	let div4;
    	let div3;
    	let i0;
    	let t12;
    	let div8;
    	let input1;
    	let t13;
    	let div7;
    	let div6;
    	let i1;
    	let t14;
    	let div11;
    	let textarea;
    	let t15;
    	let div10;
    	let div9;
    	let i2;
    	let t16;
    	let button;
    	let t18;
    	let div16;
    	let div15;
    	let div14;
    	let t19;
    	let footer;
    	let current;
    	header = new Header({ $$inline: true });
    	footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(header.$$.fragment);
    			t0 = space();
    			section0 = element("section");
    			div0 = element("div");
    			t1 = space();
    			div2 = element("div");
    			div1 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Contact Us";
    			t3 = space();
    			p = element("p");
    			p.textContent = "Give a helping hand for poor people";
    			t5 = space();
    			ul = element("ul");
    			li = element("li");
    			a = element("a");
    			a.textContent = "Home /";
    			t7 = text(" Contact");
    			t8 = space();
    			main = element("main");
    			section1 = element("section");
    			div19 = element("div");
    			div18 = element("div");
    			div17 = element("div");
    			div13 = element("div");
    			div12 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Drop us a line";
    			t10 = space();
    			form = element("form");
    			div5 = element("div");
    			input0 = element("input");
    			t11 = space();
    			div4 = element("div");
    			div3 = element("div");
    			i0 = element("i");
    			t12 = space();
    			div8 = element("div");
    			input1 = element("input");
    			t13 = space();
    			div7 = element("div");
    			div6 = element("div");
    			i1 = element("i");
    			t14 = space();
    			div11 = element("div");
    			textarea = element("textarea");
    			t15 = space();
    			div10 = element("div");
    			div9 = element("div");
    			i2 = element("i");
    			t16 = space();
    			button = element("button");
    			button.textContent = "submit";
    			t18 = space();
    			div16 = element("div");
    			div15 = element("div");
    			div14 = element("div");
    			t19 = space();
    			create_component(footer.$$.fragment);
    			attr_dev(div0, "class", "xs-black-overlay");
    			add_location(div0, file$2, 48, 1, 2537);
    			add_location(h2, file$2, 51, 3, 2657);
    			add_location(p, file$2, 52, 3, 2681);
    			attr_dev(a, "href", "index.html");
    			attr_dev(a, "class", "color-white");
    			add_location(a, file$2, 54, 47, 2802);
    			attr_dev(li, "class", "badge badge-pill badge-primary");
    			add_location(li, file$2, 54, 4, 2759);
    			attr_dev(ul, "class", "xs-breadcumb");
    			add_location(ul, file$2, 53, 3, 2728);
    			attr_dev(div1, "class", "color-white xs-inner-banner-content");
    			add_location(div1, file$2, 50, 2, 2603);
    			attr_dev(div2, "class", "container");
    			add_location(div2, file$2, 49, 1, 2576);
    			attr_dev(section0, "class", "xs-banner-inner-section parallax-window");
    			set_style(section0, "background-image", "url('assets/images/contact_bg.png')");
    			add_location(section0, file$2, 47, 0, 2416);
    			add_location(h4, file$2, 70, 6, 3225);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "name", "name");
    			attr_dev(input0, "id", "xs-name");
    			attr_dev(input0, "class", "form-control");
    			attr_dev(input0, "placeholder", "Enter Your Name.....");
    			add_location(input0, file$2, 73, 8, 3392);
    			attr_dev(i0, "class", "fa fa-user");
    			add_location(i0, file$2, 75, 39, 3575);
    			attr_dev(div3, "class", "input-group-text");
    			add_location(div3, file$2, 75, 9, 3545);
    			attr_dev(div4, "class", "input-group-append");
    			add_location(div4, file$2, 74, 8, 3502);
    			attr_dev(div5, "class", "input-group");
    			add_location(div5, file$2, 72, 7, 3357);
    			attr_dev(input1, "type", "email");
    			attr_dev(input1, "name", "email");
    			attr_dev(input1, "id", "xs-email");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "placeholder", "Enter Your Email.....");
    			add_location(input1, file$2, 79, 8, 3707);
    			attr_dev(i1, "class", "fa fa-envelope-o");
    			add_location(i1, file$2, 81, 39, 3894);
    			attr_dev(div6, "class", "input-group-text");
    			add_location(div6, file$2, 81, 9, 3864);
    			attr_dev(div7, "class", "input-group-append");
    			add_location(div7, file$2, 80, 8, 3821);
    			attr_dev(div8, "class", "input-group");
    			add_location(div8, file$2, 78, 7, 3672);
    			attr_dev(textarea, "name", "massage");
    			attr_dev(textarea, "placeholder", "Enter Your Message.....");
    			attr_dev(textarea, "id", "xs-massage");
    			attr_dev(textarea, "class", "form-control");
    			attr_dev(textarea, "cols", "30");
    			attr_dev(textarea, "rows", "10");
    			add_location(textarea, file$2, 85, 8, 4046);
    			attr_dev(i2, "class", "fa fa-pencil");
    			add_location(i2, file$2, 87, 39, 4260);
    			attr_dev(div9, "class", "input-group-text");
    			add_location(div9, file$2, 87, 9, 4230);
    			attr_dev(div10, "class", "input-group-append");
    			add_location(div10, file$2, 86, 8, 4187);
    			attr_dev(div11, "class", "input-group massage-group");
    			add_location(div11, file$2, 84, 7, 3997);
    			attr_dev(button, "class", "btn btn-success");
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "id", "xs-submit");
    			add_location(button, file$2, 90, 7, 4359);
    			attr_dev(form, "action", "#");
    			attr_dev(form, "method", "POST");
    			attr_dev(form, "id", "xs-contact-form");
    			attr_dev(form, "class", "xs-contact-form contact-form-v2");
    			add_location(form, file$2, 71, 6, 3256);
    			attr_dev(div12, "class", "xs-contact-form-wraper");
    			add_location(div12, file$2, 69, 5, 3181);
    			attr_dev(div13, "class", "col-lg-6");
    			add_location(div13, file$2, 68, 4, 3152);
    			attr_dev(div14, "id", "xs-map");
    			attr_dev(div14, "class", "xs-box-shadow-2");
    			add_location(div14, file$2, 96, 6, 4642);
    			attr_dev(div15, "class", "xs-maps-wraper map-wraper-v2");
    			add_location(div15, file$2, 95, 5, 4592);
    			attr_dev(div16, "class", "col-lg-6");
    			add_location(div16, file$2, 94, 4, 4563);
    			attr_dev(div17, "class", "row");
    			add_location(div17, file$2, 67, 3, 3129);
    			attr_dev(div18, "class", "xs-contact-container");
    			add_location(div18, file$2, 66, 2, 3090);
    			attr_dev(div19, "class", "container");
    			add_location(div19, file$2, 65, 1, 3063);
    			attr_dev(section1, "class", "xs-contact-section-v2");
    			add_location(section1, file$2, 64, 1, 3021);
    			attr_dev(main, "class", "xs-main");
    			add_location(main, file$2, 62, 0, 2969);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(header, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, section0, anchor);
    			append_dev(section0, div0);
    			append_dev(section0, t1);
    			append_dev(section0, div2);
    			append_dev(div2, div1);
    			append_dev(div1, h2);
    			append_dev(div1, t3);
    			append_dev(div1, p);
    			append_dev(div1, t5);
    			append_dev(div1, ul);
    			append_dev(ul, li);
    			append_dev(li, a);
    			append_dev(li, t7);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, section1);
    			append_dev(section1, div19);
    			append_dev(div19, div18);
    			append_dev(div18, div17);
    			append_dev(div17, div13);
    			append_dev(div13, div12);
    			append_dev(div12, h4);
    			append_dev(div12, t10);
    			append_dev(div12, form);
    			append_dev(form, div5);
    			append_dev(div5, input0);
    			append_dev(div5, t11);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, i0);
    			append_dev(form, t12);
    			append_dev(form, div8);
    			append_dev(div8, input1);
    			append_dev(div8, t13);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, i1);
    			append_dev(form, t14);
    			append_dev(form, div11);
    			append_dev(div11, textarea);
    			append_dev(div11, t15);
    			append_dev(div11, div10);
    			append_dev(div10, div9);
    			append_dev(div9, i2);
    			append_dev(form, t16);
    			append_dev(form, button);
    			append_dev(div17, t18);
    			append_dev(div17, div16);
    			append_dev(div16, div15);
    			append_dev(div15, div14);
    			insert_dev(target, t19, anchor);
    			mount_component(footer, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(header, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(section0);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(main);
    			if (detaching) detach_dev(t19);
    			destroy_component(footer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function init() {
    	// Basic options for a simple Google Map
    	var mapOptions = {
    		// How zoomed in you want the map to start at (always required)
    		zoom: 11,
    		scrollwheel: false,
    		navigationControl: false,
    		mapTypeControl: true,
    		scaleControl: false,
    		draggable: true,
    		disableDefaultUI: true,
    		// The latitude and longitude to center the map (always required)
    		center: new google.maps.LatLng(40.6700, -73.9400), // New York
    		// How you would like to style the map. 
    		// This is where you would paste any style found on Snazzy Maps.
    		styles: [
    			{
    				"featureType": "administrative",
    				"elementType": "all",
    				"stylers": [{ "saturation": "-100" }]
    			},
    			{
    				"featureType": "administrative.province",
    				"elementType": "all",
    				"stylers": [{ "visibility": "off" }]
    			},
    			{
    				"featureType": "landscape",
    				"elementType": "all",
    				"stylers": [{ "saturation": -100 }, { "lightness": 65 }, { "visibility": "on" }]
    			},
    			{
    				"featureType": "poi",
    				"elementType": "all",
    				"stylers": [
    					{ "saturation": -100 },
    					{ "lightness": "50" },
    					{ "visibility": "simplified" }
    				]
    			},
    			{
    				"featureType": "road",
    				"elementType": "all",
    				"stylers": [{ "saturation": "-100" }]
    			},
    			{
    				"featureType": "road.highway",
    				"elementType": "all",
    				"stylers": [{ "visibility": "simplified" }]
    			},
    			{
    				"featureType": "road.arterial",
    				"elementType": "all",
    				"stylers": [{ "lightness": "30" }]
    			},
    			{
    				"featureType": "road.local",
    				"elementType": "all",
    				"stylers": [{ "lightness": "40" }]
    			},
    			{
    				"featureType": "transit",
    				"elementType": "all",
    				"stylers": [{ "saturation": -100 }, { "visibility": "simplified" }]
    			},
    			{
    				"featureType": "water",
    				"elementType": "geometry",
    				"stylers": [{ "hue": "#ffff00" }, { "lightness": -25 }, { "saturation": -97 }]
    			},
    			{
    				"featureType": "water",
    				"elementType": "labels",
    				"stylers": [{ "lightness": -25 }, { "saturation": -100 }]
    			}
    		]
    	};

    	// Get the HTML DOM element that will contain your map 
    	// We are using a div with id="map" seen below in the <body>
    	var mapElement = document.getElementById('xs-map');

    	// Create the Google Map using our element and options defined above
    	var map = new google.maps.Map(mapElement, mapOptions);

    	// Let's also add a marker while we're at it
    	new google.maps.Marker({
    			position: new google.maps.LatLng(40.6700, -73.9400),
    			map,
    			title: 'Snazzy!'
    		});
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Contact', slots, []);
    	google.maps.event.addDomListener(window, 'load', init);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Contact> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Header, Footer, init });
    	return [];
    }

    class Contact extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init$1(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Contact",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\pages\Donation.svelte generated by Svelte v3.46.4 */
    const file$1 = "src\\pages\\Donation.svelte";

    // (38:4) {#if data}
    function create_if_block(ctx) {
    	let section0;
    	let div0;
    	let t0;
    	let div2;
    	let div1;
    	let h20;
    	let t2;
    	let p0;
    	let t3_value = /*data*/ ctx[0].title + "";
    	let t3;
    	let t4;
    	let ul;
    	let li;
    	let a;
    	let t6;
    	let t7;
    	let main;
    	let section1;
    	let div13;
    	let div12;
    	let div4;
    	let div3;
    	let img;
    	let img_src_value;
    	let t8;
    	let div11;
    	let div10;
    	let div5;
    	let h21;
    	let t9_value = /*data*/ ctx[0].title + "";
    	let t9;
    	let t10;
    	let p1;
    	let t11;
    	let span0;
    	let t13;
    	let span1;
    	let t15;
    	let span2;
    	let t16;
    	let form;
    	let div6;
    	let label0;
    	let t17;
    	let span3;
    	let t19;
    	let input0;
    	let t20;
    	let div7;
    	let label1;
    	let t21;
    	let span4;
    	let t23;
    	let input1;
    	let t24;
    	let div8;
    	let label2;
    	let t25;
    	let span5;
    	let t27;
    	let input2;
    	let t28;
    	let div9;
    	let input3;
    	let t29;
    	let label3;
    	let t30;
    	let span6;
    	let t32;
    	let button;
    	let span7;
    	let i;
    	let t33;

    	const block = {
    		c: function create() {
    			section0 = element("section");
    			div0 = element("div");
    			t0 = space();
    			div2 = element("div");
    			div1 = element("div");
    			h20 = element("h2");
    			h20.textContent = "Donate Now";
    			t2 = space();
    			p0 = element("p");
    			t3 = text(t3_value);
    			t4 = space();
    			ul = element("ul");
    			li = element("li");
    			a = element("a");
    			a.textContent = "Home /";
    			t6 = text(" Donate");
    			t7 = space();
    			main = element("main");
    			section1 = element("section");
    			div13 = element("div");
    			div12 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			img = element("img");
    			t8 = space();
    			div11 = element("div");
    			div10 = element("div");
    			div5 = element("div");
    			h21 = element("h2");
    			t9 = text(t9_value);
    			t10 = space();
    			p1 = element("p");
    			t11 = text("To learn more about make donate charity\r\n\twith us visit our \"");
    			span0 = element("span");
    			span0.textContent = "Contact\r\n\tus";
    			t13 = text("\" site. By calling ");
    			span1 = element("span");
    			span1.textContent = "+44(0) 800 883 8450";
    			t15 = text(".");
    			span2 = element("span");
    			t16 = space();
    			form = element("form");
    			div6 = element("div");
    			label0 = element("label");
    			t17 = text("Donation Amount ");
    			span3 = element("span");
    			span3.textContent = "**";
    			t19 = space();
    			input0 = element("input");
    			t20 = space();
    			div7 = element("div");
    			label1 = element("label");
    			t21 = text("Your Name\r\n\t");
    			span4 = element("span");
    			span4.textContent = "**";
    			t23 = space();
    			input1 = element("input");
    			t24 = space();
    			div8 = element("div");
    			label2 = element("label");
    			t25 = text("Your email\r\n            ");
    			span5 = element("span");
    			span5.textContent = "**";
    			t27 = space();
    			input2 = element("input");
    			t28 = space();
    			div9 = element("div");
    			input3 = element("input");
    			t29 = space();
    			label3 = element("label");
    			t30 = text("I Agree\r\n                 ");
    			span6 = element("span");
    			span6.textContent = "**";
    			t32 = space();
    			button = element("button");
    			span7 = element("span");
    			i = element("i");
    			t33 = text(" Donate now");
    			attr_dev(div0, "class", "xs-black-overlay");
    			add_location(div0, file$1, 40, 1, 979);
    			add_location(h20, file$1, 43, 1, 1096);
    			add_location(p0, file$1, 44, 1, 1118);
    			attr_dev(a, "href", "/");
    			attr_dev(a, "class", "color-white");
    			add_location(a, file$1, 47, 1, 1214);
    			attr_dev(li, "class", "badge badge-pill badge-primary");
    			add_location(li, file$1, 46, 1, 1168);
    			attr_dev(ul, "class", "xs-breadcumb");
    			add_location(ul, file$1, 45, 1, 1140);
    			attr_dev(div1, "class", "color-white xs-inner-banner-content");
    			add_location(div1, file$1, 42, 1, 1044);
    			attr_dev(div2, "class", "container");
    			add_location(div2, file$1, 41, 1, 1018);
    			attr_dev(section0, "class", "xs-banner-inner-section parallax-window");
    			set_style(section0, "background-image", "url('/assets/images/backgrounds/kat-yukawa-K0E6E0a0R3A-unsplash.jpg')");
    			add_location(section0, file$1, 38, 1, 821);
    			if (!src_url_equal(img.src, img_src_value = /*data*/ ctx[0].thumbnail)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "img-responsive");
    			attr_dev(img, "alt", "Family Images");
    			add_location(img, file$1, 60, 38, 1582);
    			attr_dev(div3, "class", "xs-donation-form-images svelte-7e49g0");
    			add_location(div3, file$1, 60, 1, 1545);
    			attr_dev(div4, "class", "col-lg-6");
    			add_location(div4, file$1, 59, 1, 1520);
    			attr_dev(h21, "class", "xs-title");
    			add_location(h21, file$1, 67, 1, 1782);
    			attr_dev(span0, "class", "color-green");
    			add_location(span0, file$1, 69, 20, 1901);
    			attr_dev(span1, "class", "color-green");
    			add_location(span1, file$1, 70, 29, 1965);
    			attr_dev(p1, "class", "small");
    			add_location(p1, file$1, 68, 1, 1823);
    			attr_dev(span2, "class", "xs-separetor v2");
    			add_location(span2, file$1, 71, 46, 2025);
    			attr_dev(div5, "class", "xs-heading xs-mb-30");
    			add_location(div5, file$1, 66, 1, 1746);
    			attr_dev(span3, "class", "color-light-red");
    			add_location(span3, file$1, 78, 45, 2287);
    			attr_dev(label0, "for", "xs-donate-name");
    			add_location(label0, file$1, 78, 1, 2243);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "name", "name");
    			attr_dev(input0, "id", "xs-donate-name");
    			attr_dev(input0, "class", "form-control");
    			attr_dev(input0, "placeholder", "Minimum of $5");
    			add_location(input0, file$1, 79, 37, 2338);
    			attr_dev(div6, "class", "xs-input-group");
    			add_location(div6, file$1, 77, 1, 2212);
    			attr_dev(span4, "class", "color-light-red");
    			add_location(span4, file$1, 86, 1, 2559);
    			attr_dev(label1, "for", "xs-donate-charity");
    			add_location(label1, file$1, 85, 1, 2516);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "name", "name");
    			attr_dev(input1, "id", "xs-donate-name");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "placeholder", "your awesome name");
    			add_location(input1, file$1, 88, 4, 2618);
    			attr_dev(div7, "class", "xs-input-group");
    			add_location(div7, file$1, 84, 1, 2485);
    			attr_dev(span5, "class", "color-light-red");
    			add_location(span5, file$1, 99, 12, 2874);
    			attr_dev(label2, "for", "xs-donate-email");
    			add_location(label2, file$1, 97, 8, 2807);
    			attr_dev(input2, "type", "email");
    			attr_dev(input2, "name", "email");
    			attr_dev(input2, "id", "xs-donate-email");
    			attr_dev(input2, "class", "farm-control");
    			attr_dev(input2, "placeholder", "email@awesome.com");
    			add_location(input2, file$1, 101, 12, 2949);
    			attr_dev(div8, "class", "xs-input-group");
    			add_location(div8, file$1, 96, 4, 2769);
    			attr_dev(input3, "type", "checkbox");
    			attr_dev(input3, "name", "agree");
    			attr_dev(input3, "id", "xs-donate-agree");
    			attr_dev(input3, "class", "svelte-7e49g0");
    			add_location(input3, file$1, 110, 16, 3239);
    			attr_dev(span6, "class", "color-light-red");
    			add_location(span6, file$1, 113, 17, 3390);
    			attr_dev(label3, "for", "xs-donate-agree");
    			attr_dev(label3, "class", "svelte-7e49g0");
    			add_location(label3, file$1, 111, 16, 3316);
    			attr_dev(div9, "class", "xs-input-group svelte-7e49g0");
    			attr_dev(div9, "id", "xs-input-checkbox");
    			add_location(div9, file$1, 109, 12, 3170);
    			attr_dev(i, "class", "fa fa-heart");
    			add_location(i, file$1, 117, 67, 3581);
    			attr_dev(span7, "class", "badge");
    			add_location(span7, file$1, 117, 47, 3561);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "btn btn-warning");
    			add_location(button, file$1, 117, 1, 3515);
    			attr_dev(form, "action", "#");
    			attr_dev(form, "method", "post");
    			attr_dev(form, "id", "xs-donation-form");
    			attr_dev(form, "class", "xs-donation-form");
    			attr_dev(form, "name", "xs-donation-form");
    			add_location(form, file$1, 75, 1, 2104);
    			attr_dev(div10, "class", "xs-donation-form-wraper");
    			add_location(div10, file$1, 65, 1, 1706);
    			attr_dev(div11, "class", "col-lg-6");
    			add_location(div11, file$1, 64, 1, 1681);
    			attr_dev(div12, "class", "row");
    			add_location(div12, file$1, 58, 1, 1500);
    			attr_dev(div13, "class", "container");
    			add_location(div13, file$1, 57, 1, 1474);
    			attr_dev(section1, "class", "xs-section-padding bg-gray");
    			add_location(section1, file$1, 56, 1, 1427);
    			attr_dev(main, "class", "xs-main");
    			add_location(main, file$1, 54, 1, 1369);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section0, anchor);
    			append_dev(section0, div0);
    			append_dev(section0, t0);
    			append_dev(section0, div2);
    			append_dev(div2, div1);
    			append_dev(div1, h20);
    			append_dev(div1, t2);
    			append_dev(div1, p0);
    			append_dev(p0, t3);
    			append_dev(div1, t4);
    			append_dev(div1, ul);
    			append_dev(ul, li);
    			append_dev(li, a);
    			append_dev(li, t6);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, section1);
    			append_dev(section1, div13);
    			append_dev(div13, div12);
    			append_dev(div12, div4);
    			append_dev(div4, div3);
    			append_dev(div3, img);
    			append_dev(div12, t8);
    			append_dev(div12, div11);
    			append_dev(div11, div10);
    			append_dev(div10, div5);
    			append_dev(div5, h21);
    			append_dev(h21, t9);
    			append_dev(div5, t10);
    			append_dev(div5, p1);
    			append_dev(p1, t11);
    			append_dev(p1, span0);
    			append_dev(p1, t13);
    			append_dev(p1, span1);
    			append_dev(p1, t15);
    			append_dev(div5, span2);
    			append_dev(div10, t16);
    			append_dev(div10, form);
    			append_dev(form, div6);
    			append_dev(div6, label0);
    			append_dev(label0, t17);
    			append_dev(label0, span3);
    			append_dev(div6, t19);
    			append_dev(div6, input0);
    			append_dev(form, t20);
    			append_dev(form, div7);
    			append_dev(div7, label1);
    			append_dev(label1, t21);
    			append_dev(label1, span4);
    			append_dev(div7, t23);
    			append_dev(div7, input1);
    			append_dev(form, t24);
    			append_dev(form, div8);
    			append_dev(div8, label2);
    			append_dev(label2, t25);
    			append_dev(label2, span5);
    			append_dev(div8, t27);
    			append_dev(div8, input2);
    			append_dev(form, t28);
    			append_dev(form, div9);
    			append_dev(div9, input3);
    			append_dev(div9, t29);
    			append_dev(div9, label3);
    			append_dev(label3, t30);
    			append_dev(label3, span6);
    			append_dev(form, t32);
    			append_dev(form, button);
    			append_dev(button, span7);
    			append_dev(span7, i);
    			append_dev(button, t33);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data*/ 1 && t3_value !== (t3_value = /*data*/ ctx[0].title + "")) set_data_dev(t3, t3_value);

    			if (dirty & /*data*/ 1 && !src_url_equal(img.src, img_src_value = /*data*/ ctx[0].thumbnail)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*data*/ 1 && t9_value !== (t9_value = /*data*/ ctx[0].title + "")) set_data_dev(t9, t9_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section0);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(main);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(38:4) {#if data}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let header;
    	let t0;
    	let t1;
    	let footer;
    	let current;
    	header = new Header({ $$inline: true });
    	let if_block = /*data*/ ctx[0] && create_if_block(ctx);
    	footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(header.$$.fragment);
    			t0 = space();
    			if (if_block) if_block.c();
    			t1 = space();
    			create_component(footer.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(header, target, anchor);
    			insert_dev(target, t0, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(footer, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*data*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(t1.parentNode, t1);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(header, detaching);
    			if (detaching) detach_dev(t0);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(footer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Donation', slots, []);
    	let { params } = $$props;
    	let data;

    	function getCharity(id) {
    		return charities.charities.find(function (charity) {
    			return charity.id === parseInt(id);
    		});
    	}

    	data = getCharity(params.id);
    	const writable_props = ['params'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Donation> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('params' in $$props) $$invalidate(1, params = $$props.params);
    	};

    	$$self.$capture_state = () => ({
    		Header,
    		Footer,
    		charities: charities.charities,
    		params,
    		data,
    		getCharity
    	});

    	$$self.$inject_state = $$props => {
    		if ('params' in $$props) $$invalidate(1, params = $$props.params);
    		if ('data' in $$props) $$invalidate(0, data = $$props.data);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [data, params];
    }

    class Donation extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init$1(this, options, instance$2, create_fragment$2, safe_not_equal, { params: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Donation",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*params*/ ctx[1] === undefined && !('params' in props)) {
    			console.warn("<Donation> was created without expected prop 'params'");
    		}
    	}

    	get params() {
    		throw new Error("<Donation>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set params(value) {
    		throw new Error("<Donation>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\pages\NotFound.svelte generated by Svelte v3.46.4 */

    const file = "src\\pages\\NotFound.svelte";

    function create_fragment$1(ctx) {
    	let section;
    	let div2;
    	let div1;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let h2;
    	let t2;
    	let p;
    	let t4;
    	let a;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			h2 = element("h2");
    			h2.textContent = "Oops!";
    			t2 = space();
    			p = element("p");
    			p.textContent = "Ada yang salah dengan halamannya. Saya tidak dapat menemukannya.";
    			t4 = space();
    			a = element("a");
    			a.textContent = "Kembali ke halaman rumah";
    			if (!src_url_equal(img.src, img_src_value = "/assets/images/page-not-found.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			attr_dev(img, "width", "450");
    			attr_dev(img, "height", "450");
    			add_location(img, file, 5, 10, 241);
    			attr_dev(h2, "class", "xs-title");
    			add_location(h2, file, 10, 10, 384);
    			add_location(p, file, 11, 10, 427);
    			attr_dev(a, "href", "/");
    			attr_dev(a, "class", "btn btn-primary mt-4");
    			add_location(a, file, 12, 10, 510);
    			attr_dev(div0, "class", "col-md-6 col-xl-6");
    			add_location(div0, file, 4, 8, 198);
    			attr_dev(div1, "class", "xs-heading row xs-mb-60 justify-content-center text-center");
    			add_location(div1, file, 3, 6, 116);
    			attr_dev(div2, "class", "container");
    			add_location(div2, file, 2, 4, 85);
    			attr_dev(section, "class", "waypoint-tigger xs-section-padding");
    			add_location(section, file, 1, 0, 27);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, img);
    			append_dev(div0, t0);
    			append_dev(div0, h2);
    			append_dev(div0, t2);
    			append_dev(div0, p);
    			append_dev(div0, t4);
    			append_dev(div0, a);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('NotFound', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<NotFound> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class NotFound extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init$1(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NotFound",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.46.4 */

    function create_fragment(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*page*/ ctx[0];

    	function switch_props(ctx) {
    		return {
    			props: { params: /*params*/ ctx[1] },
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const switch_instance_changes = {};
    			if (dirty & /*params*/ 2) switch_instance_changes.params = /*params*/ ctx[1];

    			if (switch_value !== (switch_value = /*page*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let page$1, params;
    	page('/', () => $$invalidate(0, page$1 = Home));
    	page('/about', () => $$invalidate(0, page$1 = About));
    	page('/contact', () => $$invalidate(0, page$1 = Contact));

    	page(
    		"/donation/:id",
    		(ctx, next) => {
    			$$invalidate(1, params = ctx.params);
    			next();
    		},
    		() => $$invalidate(0, page$1 = Donation)
    	);

    	page('/*', () => $$invalidate(0, page$1 = NotFound));
    	page.start();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		router: page,
    		Home,
    		About,
    		Contact,
    		Donation,
    		NotFound,
    		page: page$1,
    		params
    	});

    	$$self.$inject_state = $$props => {
    		if ('page' in $$props) $$invalidate(0, page$1 = $$props.page);
    		if ('params' in $$props) $$invalidate(1, params = $$props.params);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [page$1, params];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init$1(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.querySelector("#root")
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
