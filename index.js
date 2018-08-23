const Procedural = module.exports = class Procedural {
  constructor(context, rules = []) {
    this.context = context;
    this.rules = rules.slice();
    this.maxSamples = 4;
    this.strict = true;
    this.outputBase = "";
    this.ruleSelection = "all";
  }

  setContext(context) {
    this.context = context;
  }

  setMaxSamples(maxSamples) {
    this.maxSamples = maxSamples;

    return this;
  }

  setOutputBase(outputBase) {
    this.outputBase = outputBase;

    return this;
  }

  setRuleSelection(method) {
    this.ruleSelection = method;
  }

  addRule(...rules) {
    this.rules = this.rules.concat(rules);

    return this;
  }

  removeRule(name) {
    let id = this.rules.findIndex((rule) => rule.name === name);
    if (~id) {
      this.rules.splice(id, 1);
    }
    else if (this.strict) {
      throw new Error("No rule named '" + name + "'");
    }

    return this;
  }

  run() {
    // initialise output object
    let output = new Procedural.Output(
      clone(this.outputBase),
      this.run.bind(this)
    );
    // find matching rules and activate them
    let rules = this.getMatchingRules();
    rules = this.selectRules(rules);
    rules.forEach((rule) => this.activateRule(rule, output));

    return output;
  }

  getMatchingRules() {
    //return this.rules.filter((rule) => this.matchRule(rule, this.context));
    let result = [];
    for (let rule of this.rules) {
      if (typeof rule.on === "function") {
        let objects = rule.on(this.context);
        if (Array.isArray(objects)) {
          for (let object of objects) {
            if (this.matchRule(rule, object)) {
              result.push(new RuleWrapper(rule, object));
            }
          }
        }
      }
      else if (Array.isArray(rule.on)) { // multi-dimensional on
        let step = (ctx, layer) => {
          let objects = rule.on[layer](ctx);
          for (let object of objects) {
            if (layer === rule.on.length - 1) {
              if (this.matchRule(rule, object)) {
                result.push(new RuleWrapper(rule, object));
              }
            }
            else {
              step(object, layer + 1);
            }
          }
        }
        step(this.context, 0);
      }
      else {
        if (this.matchRule(rule, this.context)) {
          result.push(rule);
        }
      }
    }
    return result;
  }

  matchRule(rule, context) {
    if (typeof rule.test === "function") {
      return rule.test(context);
    }
    else if (typeof rule.test === "boolean") {
      return rule.test;
    }

    return false;
  }

  selectRules(rules) {
    if (!rules.length) return [];
    if (this.ruleSelection === "all") {
      return rules;
    }
    else if (this.ruleSelection === "first") {
      return [rules[0]];
    }
    else if (this.ruleSelection === "priority") {
      let max = rules[0];
      rules.forEach((rule) => (rule.priority || 0) > (max.priority || 0) ? max = rule : 0);
      return [max];
    }
    else if (this.ruleSelection === "random") {
      let probSum = rules.reduce((acc, act) => acc + (act.rate || 1), 0);
      let r = Math.random() * probSum, s = 0;
      for (let rule of rules) {
        if ((s += (rule.rate || 1)) > r) {
          return [rule];
        }
      }
    }

    return [];
  }

  activateRule(rule, output, n = 0) {
    if (n >= this.maxSamples) {
      if (this.strict) throw new Error("Max sample amount reached");
      return false;
    }

    if (typeof rule.action === "function") {
      return rule.action(this.context, output);
    }
    else if (
      typeof rule.action === "string"
      || Array.isArray(rule.action)
    ) {
      const runRuleByName = (name) => { // loop for every rule
        let rule = this.rules.find((rule) => rule.name === name);
        if (!rule) {
          if (this.strict) throw new Error("No rule named '" + name + "'");
          return false;
        }
        this.activateRule(rule, output, n + 1);
      }

      let action = typeof rule.action === "string" ? [rule.action] : rule.action;
      action.forEach(runRuleByName);
    }

    return false;
  }
}

function clone(value) {
  if (typeof value === "object") {
    if (Array.isArray(value)) {
      return value.slice();
    }
    else {
      return Object.assign({}, value);
    }
  }
  else {
    return value;
  }
}

const Output = Procedural.Output = class Output {
  constructor(content, again = ()=>{}) {
    this.content = content;
    this._again = again;
  }

  append(content, separator) {
    if (typeof this.content === "string") {
      this.content += (this.content.length ? separator || " " : "") + content;
    }
    else if (Array.isArray(this.content)) {
      this.content.push(content);
    }
    else if (typeof this.content === "number" || typeof this.content === "boolean") {
      throw new Error("Cannot append boolean or number");
    }
    return this;
  }

  blendOutput(output, separator) {
    if (typeof this.content === "string") {
      this.content += (separator || "") + output.content;
    }
    else if (Array.isArray(this.content)) {
      this.content = this.content.append(output);
    }
    else if (typeof this.content === "object") {
      Object.assign(this.content, output.content);
    }

    return this;
  }

  set(a, b = Output.undefined) {
    if (b === Output.undefined) {
      this.content = a;
    }
    else {
      this.content[a] = b;
    }
  }

  get() {
    return this.content;
  }

  // repeats the triggering function, and appends the output using the `separator`
  again(separator, ...args) {
    if (typeof this._again === "function") {
      let output = this._again(...args);
      return this.blendOutput(output, separator);
    }
  }
}

Output.undefined = Symbol("undefined");

const RuleWrapper = Procedural.RuleWrapper = class RuleWrapper {
  constructor(rule, context) {
    this.rule = rule;
    this.context = context;
  }

  action(context, output) {
    if (typeof this.rule.action === "function") {
      this.rule.action(this.context, output, context);
    }
  }

  test(context) {
    if (typeof this.rule.test === "function") {
      this.rule.test(this.context, context);
    }
    else return !!this.rule.test;
  }

  get name() {
    return this.rule.name;
  }

  get priority() {
    return this.rule.priority;
  }

  get rate() {
    return this.rule.rate;
  }
}
