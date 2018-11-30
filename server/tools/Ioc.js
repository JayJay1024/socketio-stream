'use strict';

const wm = new WeakMap() 
  , mm = { } 
;

class Ioc {
  static register(name, func) {
    mm[name] = func;
    wm.set(func, [].slice.call(arguments, 2));
  }

  static createIoc(cache) {
    return new Ioc(cache);
  }
  

  constructor(cache) {
    cache = cache ? cache : {};
    cache['@'] = this;
    wm.set(this, cache);
  }
  
  get(name) {
    const cc = wm.get(this);
    var o = cc[name];
    if (o != null)
      return o;
    return cc[name] = this.create(name);
  }
  
  create(name) {
    var func = mm[name], args = [null], o;
    if (!func) {
      try {require('../services/' + name);}catch(e) { }
      func = mm[name];
    }
    wm.get(func).forEach((n) => args.push(this.get(n)));
    return new (Function.prototype.bind.apply(func, args));
  }
}

module.exports = Ioc;
