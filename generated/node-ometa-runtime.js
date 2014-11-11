// try to use StringBuffer instead of string concatenation to improve performance

function StringBuffer() {
  this.strings = []
  for (var idx = 0; idx < arguments.length; idx++)
    this.nextPutAll(arguments[idx])
}
StringBuffer.prototype.nextPutAll = function(s) { this.strings.push(s) }
StringBuffer.prototype.contents   = function()  { return this.strings.join("") }
function makeWriteStream(str) {
    return new StringBuffer(str)
}

// make Arrays print themselves sensibly

var printOn = function(x, ws) {
  if (x === undefined || x === null)
    ws.nextPutAll("" + x)
  else if (x.constructor === Array) {
    ws.nextPutAll("[")
    for (var idx = 0; idx < x.length; idx++) {
      if (idx > 0)
        ws.nextPutAll(", ")
      printOn(x[idx], ws)
    }
    ws.nextPutAll("]")
  }
  else
    ws.nextPutAll(x.toString())
}

// delegation

var objectThatDelegatesTo = function(x, props) {
  var f = function() { }
  f.prototype = x
  var r = new f()
  for (var p in props)
    if (props.hasOwnProperty(p))
      r[p] = props[p]
  return r
}

// some reflective stuff

var ownPropertyNames = function(x) {
  var r = []
  for (var name in x)
    if (x.hasOwnProperty(name))
      r.push(name)
  return r
}

var isImmutable = function(x) {
   return x === null || x === undefined || typeof x === "boolean" || typeof x === "number" || typeof x === "string"
}

var isSequenceable = function(x) { return typeof x == "string" || x.constructor === Array }

// Squeak's ReadStream, kind of

function ReadStream(anArrayOrString) {
  this.src = anArrayOrString
  this.pos = 0
}
ReadStream.prototype.atEnd = function() { return this.pos >= this.src.length }
ReadStream.prototype.next  = function() { return at(this.src, this.pos++) }

// escape characters

pad = function(str, s, len) {
  var r = str
  while (r.length < len)
    r = s + r
  return r
}

var escapeStringFor = new Object()
for (var c = 0; c < 128; c++)
  escapeStringFor[c] = String.fromCharCode(c)
escapeStringFor["'".charCodeAt(0)]  = "\\'"
escapeStringFor['"'.charCodeAt(0)]  = '\\"'
escapeStringFor["\\".charCodeAt(0)] = "\\\\"
escapeStringFor["\b".charCodeAt(0)] = "\\b"
escapeStringFor["\f".charCodeAt(0)] = "\\f"
escapeStringFor["\n".charCodeAt(0)] = "\\n"
escapeStringFor["\r".charCodeAt(0)] = "\\r"
escapeStringFor["\t".charCodeAt(0)] = "\\t"
escapeStringFor["\v".charCodeAt(0)] = "\\v"
function escapeChar(c) {
  var charCode = c.charCodeAt(0)
  if (charCode < 128)
    return escapeStringFor[charCode]
  else if (128 <= charCode && charCode < 256)
    return "\\x" + pad(charCode.toString(16), "0", 2)
  else
    return "\\u" + pad(charCode.toString(16), "0", 4)
}

function unescape(s) {
  if (s.charAt(0) == '\\')
    switch (s.charAt(1)) {
      case "'":  return "'"
      case '"':  return '"'
      case '\\': return '\\'
      case 'b':  return '\b'
      case 'f':  return '\f'
      case 'n':  return '\n'
      case 'r':  return '\r'
      case 't':  return '\t'
      case 'v':  return '\v'
      case 'x':  return String.fromCharCode(parseInt(s.substring(2, 4), 16))
      case 'u':  return String.fromCharCode(parseInt(s.substring(2, 6), 16))
      default:   return s.charAt(1)
    }
  else
    return s
}

// C-style tempnam function

function tempnam(s) { return (s ? s : "_tmpnam_") + tempnam.n++ }
tempnam.n = 0

// unique tags for objects (useful for making "hash tables")

var getTag = (function() {
  var numIdx = 0
  return function(x) {
    if (x === null || x === undefined)
      return x
    switch (typeof x) {
      case "boolean": return x == true ? "Btrue" : "Bfalse"
      case "string":  return "S" + x
      case "number":  return "N" + x
      default:        return x.hasOwnProperty("_id_") ? x._id_ : x._id_ = "R" + numIdx++
    }
  }
})()


/*
  new syntax:
    #foo and `foo	match the string object 'foo' (it's also accepted in my JS)
    'abc'		match the string object 'abc'
    'c'			match the string object 'c'
    ``abc''		match the sequence of string objects 'a', 'b', 'c'
    "abc"		token('abc')
    [1 2 3]		match the array object [1, 2, 3]
    foo(bar)		apply rule foo with argument bar
    -> ...		semantic actions written in JS (see OMetaParser's atomicHostExpr rule)
*/

/*
ometa M {
  number = number:n digit:d -> { n * 10 + digitValue(d) }
         | digit:d          -> { digitValue(d) }
}

translates to...

M = objectThatDelegatesTo(OMeta, {
  number: function() {
            return this._or(function() {
                              var n = this._apply("number"),
                                  d = this._apply("digit")
                              return n * 10 + digitValue(d)
                            },
                            function() {
                              var d = this._apply("digit")
                              return digitValue(d)
                            }
                           )
          }
})
M.matchAll("123456789", "number")
*/

// the failure exception

var fail = { toString: function() { return "match failed" } }

// streams and memoization

function OMInputStream(hd, tl) {
  this.memo = { }
  this.lst  = tl.lst
  this.idx  = tl.idx
  this.hd   = hd
  this.tl   = tl
}
OMInputStream.prototype.head = function() { return this.hd }
OMInputStream.prototype.tail = function() { return this.tl }
OMInputStream.prototype.type = function() { return this.lst.constructor }
OMInputStream.prototype.upTo = function(that) {
  var r = [], curr = this
  while (curr != that) {
    r.push(curr.head())
    curr = curr.tail()
  }
  return this.type() == String ? r.join('') : r
}

function OMInputStreamEnd(lst, idx) {
  this.memo = { }
  this.lst = lst
  this.idx = idx
}
OMInputStreamEnd.prototype = objectThatDelegatesTo(OMInputStream.prototype)
OMInputStreamEnd.prototype.head = function() { throw fail }
OMInputStreamEnd.prototype.tail = function() { throw fail }

function rest(list) {
    return Array.prototype.slice.call(list, 1);
}
function at(list, i) {
    if (typeof list === 'string') {
        return list.charAt(i);
    } else {
        // Assume this is an array.
        return list[i];
    }
}

function ListOMInputStream(lst, idx) {
  this.memo = { }
  this.lst  = lst
  this.idx  = idx
  this.hd   = at(lst, idx)
}
ListOMInputStream.prototype = objectThatDelegatesTo(OMInputStream.prototype)
ListOMInputStream.prototype.head = function() { return this.hd }
ListOMInputStream.prototype.tail = function() { return this.tl || (this.tl = makeListOMInputStream(this.lst, this.idx + 1)) }

function makeListOMInputStream(lst, idx) { return new (idx < lst.length ? ListOMInputStream : OMInputStreamEnd)(lst, idx) }

function toOMInputStream(list) {
    return makeListOMInputStream(list, 0);
}

function makeOMInputStreamProxy(target) {
  return objectThatDelegatesTo(target, {
    memo:   { },
    target: target,
    tl: undefined,
    tail:   function() { return this.tl || (this.tl = makeOMInputStreamProxy(target.tail())) }
  })
}

// Failer (i.e., that which makes things fail) is used to detect (direct) left recursion and memoize failures

function Failer() { }
Failer.prototype.used = false

// the OMeta "class" and basic functionality

var OMeta = {
  _apply: function(rule) {
    var memoRec = this.input.memo[rule]
    if (memoRec == undefined) {
      var origInput = this.input,
          failer    = new Failer()
      if (this[rule] === undefined)
        throw 'tried to apply undefined rule "' + rule + '"'
      this.input.memo[rule] = failer
      this.input.memo[rule] = memoRec = {ans: this[rule].call(this), nextInput: this.input}
      if (failer.used) {
        var sentinel = this.input
        while (true) {
          try {
            this.input = origInput
            var ans = this[rule].call(this)
            if (this.input == sentinel)
              throw fail
            memoRec.ans       = ans
            memoRec.nextInput = this.input
          }
          catch (f) {
            if (f != fail)
              throw f
            break
          }
        }
      }
    }
    else if (memoRec instanceof Failer) {
      memoRec.used = true
      throw fail
    }
    this.input = memoRec.nextInput
    return memoRec.ans
  },

  // note: _applyWithArgs and _superApplyWithArgs are not memoized, so they can't be left-recursive
  _applyWithArgs: function(rule) {
    var ruleFn = this[rule]
    var ruleFnArity = ruleFn.length
    for (var idx = arguments.length - 1; idx >= ruleFnArity + 1; idx--) // prepend "extra" arguments in reverse order
      this._prependInput(arguments[idx])
    return ruleFnArity == 0 ?
             ruleFn.call(this) :
             ruleFn.apply(this, Array.prototype.slice.call(arguments, 1, ruleFnArity + 1))
  },
  _superApplyWithArgs: function(recv, rule) {
    var ruleFn = this[rule]
    var ruleFnArity = ruleFn.length
    for (var idx = arguments.length - 1; idx >= ruleFnArity + 2; idx--) // prepend "extra" arguments in reverse order
      recv._prependInput(arguments[idx])
    return ruleFnArity == 0 ?
             ruleFn.call(recv) :
             ruleFn.apply(recv, Array.prototype.slice.call(arguments, 2, ruleFnArity + 2))
  },
  _prependInput: function(v) {
    this.input = new OMInputStream(v, this.input)
  },

  // if you want your grammar (and its subgrammars) to memoize parameterized rules, invoke this method on it:
  memoizeParameterizedRules: function() {
    this._prependInput = function(v) {
      var newInput
      if (isImmutable(v)) {
        newInput = this.input[getTag(v)]
        if (!newInput) {
          newInput = new OMInputStream(v, this.input)
          this.input[getTag(v)] = newInput
        }
      }
      else newInput = new OMInputStream(v, this.input)
      this.input = newInput
    }
    this._applyWithArgs = function(rule) {
      var ruleFnArity = this[rule].length
      for (var idx = arguments.length - 1; idx >= ruleFnArity + 1; idx--) // prepend "extra" arguments in reverse order
        this._prependInput(arguments[idx])
      return ruleFnArity == 0 ?
               this._apply(rule) :
               this[rule].apply(this, Array.prototype.slice.call(arguments, 1, ruleFnArity + 1))
    }
  },

  _pred: function(b) {
    if (b)
      return true
    throw fail
  },
  _not: function(x) {
    var origInput = this.input
    try { x.call(this) }
    catch (f) {
      if (f != fail)
        throw f
      this.input = origInput
      return true
    }
    throw fail
  },
  _lookahead: function(x) {
    var origInput = this.input,
        r         = x.call(this)
    this.input = origInput
    return r
  },
  _or: function() {
    var origInput = this.input
    for (var idx = 0; idx < arguments.length; idx++)
      try { this.input = origInput; return arguments[idx].call(this) }
      catch (f) {
        if (f != fail)
          throw f
      }
    throw fail
  },
  _xor: function(ruleName) {
    var origInput = this.input, idx = 1, newInput, ans
    while (idx < arguments.length) {
      try {
        this.input = origInput
        ans = arguments[idx].call(this)
        if (newInput)
          throw 'more than one choice matched by "exclusive-OR" in ' + ruleName
        newInput = this.input
      }
      catch (f) {
        if (f != fail)
          throw f
      }
      idx++
    }
    if (newInput) {
      this.input = newInput
      return ans
    }
    else
      throw fail
  },
  disableXORs: function() {
    this._xor = this._or
  },
  _opt: function(x) {
    var origInput = this.input, ans
    try { ans = x.call(this) }
    catch (f) {
      if (f != fail)
        throw f
      this.input = origInput
    }
    return ans
  },
  _many: function(x) {
    var ans = arguments[1] != undefined ? [arguments[1]] : []
    while (true) {
      var origInput = this.input
      try { ans.push(x.call(this)) }
      catch (f) {
        if (f != fail)
          throw f
        this.input = origInput
        break
      }
    }
    return ans
  },
  _many1: function(x) { return this._many(x, x.call(this)) },
  _form: function(x) {
    var v = this._apply("anything")
    if (!isSequenceable(v))
      throw fail
    var origInput = this.input
    this.input = toOMInputStream(v)
    var r = x.call(this)
    this._apply("end")
    this.input = origInput
    return v
  },
  _consumedBy: function(x) {
    var origInput = this.input
    x.call(this)
    return origInput.upTo(this.input)
  },
  _idxConsumedBy: function(x) {
    var origInput = this.input
    x.call(this)
    return {fromIdx: origInput.idx, toIdx: this.input.idx}
  },

  toProgramString: function(str) {
    var ws = makeWriteStream('"')
    for (var idx = 0; idx < str.length; idx++)
      ws.nextPutAll(escapeChar(str.charAt(idx)))
    ws.nextPutAll('"')
    return ws.contents()
  },

  _interleave: function(mode1, part1, mode2, part2 /* ..., moden, partn */) {
    var currInput = this.input, ans = []
    for (var idx = 0; idx < arguments.length; idx += 2)
      ans[idx / 2] = (arguments[idx] == "*" || arguments[idx] == "+") ? [] : undefined
    while (true) {
      var idx = 0, allDone = true
      while (idx < arguments.length) {
        if (arguments[idx] != "0")
          try {
            this.input = currInput
            switch (arguments[idx]) {
              case "*": ans[idx / 2].push(arguments[idx + 1].call(this));                       break
              case "+": ans[idx / 2].push(arguments[idx + 1].call(this)); arguments[idx] = "*"; break
              case "?": ans[idx / 2] =    arguments[idx + 1].call(this);  arguments[idx] = "0"; break
              case "1": ans[idx / 2] =    arguments[idx + 1].call(this);  arguments[idx] = "0"; break
              default:  throw "invalid mode '" + arguments[idx] + "' in OMeta._interleave"
            }
            currInput = this.input
            break
          }
          catch (f) {
            if (f != fail)
              throw f
            // if this (failed) part's mode is "1" or "+", we're not done yet
            allDone = allDone && (arguments[idx] == "*" || arguments[idx] == "?")
          }
        idx += 2
      }
      if (idx == arguments.length) {
        if (allDone)
          return ans
        else
          throw fail
      }
    }
  },
  _currIdx: function() { return this.input.idx },

  // some basic rules
  anything: function() {
    var r = this.input.head()
    this.input = this.input.tail()
    return r
  },
  end: function() {
    return this._not(function() { return this._apply("anything") })
  },
  pos: function() {
    return this.input.idx
  },
  empty: function() { return true },
  apply: function(r) {
    return this._apply(r)
  },
  foreign: function(g, r) {
    var gi  = objectThatDelegatesTo(g, {input: makeOMInputStreamProxy(this.input)}),
        ans = gi._apply(r)
    this.input = gi.input.target
    return ans
  },

  //  some useful "derived" rules
  exactly: function(wanted) {
    if (wanted === this._apply("anything"))
      return wanted
    throw fail
  },
  "true": function() {
    var r = this._apply("anything")
    this._pred(r === true)
    return r
  },
  "false": function() {
    var r = this._apply("anything")
    this._pred(r === false)
    return r
  },
  "undefined": function() {
    var r = this._apply("anything")
    this._pred(r === undefined)
    return r
  },
  number: function() {
    var r = this._apply("anything")
    this._pred(typeof r === "number")
    return r
  },
  string: function() {
    var r = this._apply("anything")
    this._pred(typeof r === "string")
    return r
  },
  "char": function() {
    var r = this._apply("anything")
    this._pred(typeof r === "string" && r.length == 1)
    return r
  },
  space: function() {
    var r = this._apply("char")
    this._pred(r.charCodeAt(0) <= 32)
    return r
  },
  spaces: function() {
    return this._many(function() { return this._apply("space") })
  },
  digit: function() {
    var r = this._apply("char")
    this._pred(r >= "0" && r <= "9")
    return r
  },
  lower: function() {
    var r = this._apply("char")
    this._pred(r >= "a" && r <= "z")
    return r
  },
  upper: function() {
    var r = this._apply("char")
    this._pred(r >= "A" && r <= "Z")
    return r
  },
  letter: function() {
    return this._or(function() { return this._apply("lower") },
                    function() { return this._apply("upper") })
  },
  letterOrDigit: function() {
    return this._or(function() { return this._apply("letter") },
                    function() { return this._apply("digit")  })
  },
  firstAndRest: function(first, rest)  {
     return this._many(function() { return this._apply(rest) }, this._apply(first))
  },
  seq: function(xs) {
    for (var idx = 0; idx < xs.length; idx++)
      this._applyWithArgs("exactly", at(xs, idx))
    return xs
  },
  notLast: function(rule) {
    var r = this._apply(rule)
    this._lookahead(function() { return this._apply(rule) })
    return r
  },
  listOf: function(rule, delim) {
    return this._or(function() {
                      var r = this._apply(rule)
                      return this._many(function() {
                                          this._applyWithArgs("token", delim)
                                          return this._apply(rule)
                                        },
                                        r)
                    },
                    function() { return [] })
  },
  token: function(cs) {
    this._apply("spaces")
    return this._applyWithArgs("seq", cs)
  },
  fromTo: function (x, y) {
    return this._consumedBy(function() {
                              this._applyWithArgs("seq", x)
                              this._many(function() {
                                this._not(function() { this._applyWithArgs("seq", y) })
                                this._apply("char")
                              })
                              this._applyWithArgs("seq", y)
                            })
  },

  initialize: function() { },
  // match and matchAll are a grammar's "public interface"
  _genericMatch: function(input, rule, args, matchFailed) {
    if (args == undefined)
      args = []
    var realArgs = [rule]
    for (var idx = 0; idx < args.length; idx++)
      realArgs.push(args[idx])
    var m = objectThatDelegatesTo(this, {input: input})
    m.initialize()
    try { return realArgs.length == 1 ? m._apply.call(m, realArgs[0]) : m._applyWithArgs.apply(m, realArgs) }
    catch (f) {
      if (f == fail && matchFailed != undefined) {
        var input = m.input
        if (input.idx != undefined) {
          while (input.tl != undefined && input.tl.idx != undefined)
            input = input.tl
          input.idx--
        }
        return matchFailed(m, input.idx)
      }
      throw f
    }
  },
  match: function(obj, rule, args, matchFailed) {
    return this._genericMatch(toOMInputStream([obj]),    rule, args, matchFailed)
  },
  matchAll: function(listyObj, rule, args, matchFailed) {
    return this._genericMatch(toOMInputStream(listyObj), rule, args, matchFailed)
  },
  createInstance: function() {
    var m = objectThatDelegatesTo(this)
    m.initialize()
    m.matchAll = function(listyObj, aRule) {
      this.input = toOMInputStream(listyObj)
      return this._apply(aRule)
    }
    return m
  }
}

var Parser = objectThatDelegatesTo(OMeta, {
})


module.exports = {
    fail: fail,
    OMeta: OMeta,
    objectThatDelegatesTo: objectThatDelegatesTo
};

