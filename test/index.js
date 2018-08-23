const Generative = require("../index");
const assert = require("assert");

// basic rule addition and filtering
{
  const g = new Generative({});
  assert.deepEqual(g.rules, []);
  assert.deepEqual(g.getMatchingRules(), []);
  let r1 = {
    test: () => true
  };
  g.addRule(r1);
  assert.deepEqual(g.rules, [r1], "Generative::addRule(...rules) error");
  let r2 = {
    test: () => false
  };
  let r3 = {
    test: (context) => assert.equal(context, g.context, "Generative.context should be given as argument to a rule's test closure") || 1
  }
  g.addRule(r2, r3);
  assert.deepEqual(g.rules, [r1, r2, r3], "Generative::addRule(...rules) error");
  assert.deepEqual(g.getMatchingRules(), [r1, r3], "Generative::getMatchingRules() error");
}

// rule execution
{
  let success = false;
  let rules = [
    {
      name: "A",
      test: true,
      action: ["B"]
    },
    {
      name: "B",
      action: success = true
    }
  ];

  const g = new Generative({}, rules);
  g.run();
  assert.equal(success, true, "Rule A should've triggerred rule B");
  g.removeRule("A").addRule({
    name: "C",
    action: success = false
  },
  {
    name: "A",
    test: true,
    action: ["B", "C"]
  }).run();
  assert.equal(success, false, "Rule B should've been triggered before rule C");
}

// context management
{
  let ctx = {
    rose: true, // rose hasn't been picked
    gardener: false // gardener isn't here
  };
  let rules = [
    {
      name: "A",
      test: (ctx) => !ctx.gardener,
      action: (ctx) => ctx.gardener = true
    },
    {
      name: "B",
      test: (ctx) => ctx.gardener && ctx.rose,
      action: (ctx) => ctx.rose = false
    }
  ];
  let g = new Generative(ctx, rules);
  g.run();
  assert.deepEqual(g.context, {rose: true, gardener: true});
  g.run();
  assert.deepEqual(g.context, {rose: false, gardener: true});
  g.run().again();
  assert.deepEqual(g.context, {rose: false, gardener: true});
}

// output
{
  let ctx = {
    rose: true, // rose hasn't been picked
    gardener: false // gardener isn't here
  };
  let rules = [
    {
      name: "A",
      test: (ctx) => !ctx.gardener,
      action: (ctx, out) => {
        ctx.gardener = true;
        out.append("Gardener enters the garden.");
      }
    },
    {
      name: "B",
      test: (ctx) => ctx.gardener && ctx.rose,
      action: (ctx, out) => {
        ctx.rose = false;
        out.append("The Gardener picks the rose.");
      }
    },
    {
      name: "C",
      test: (ctx) => ctx.gardener && !ctx.rose,
      action: (ctx, out) => out.append("Rose already picked,", "\n")
    },
    {
      name: "D",
      test: (ctx) => ctx.gardener && !ctx.rose,
      action: (ctx, out) => out.append("so the gardener can't pick it up anymore.", " ")
    }
  ];
  const g = new Generative(ctx, rules);
  assert.equal(g.run().again("\n").get(), "Gardener enters the garden.\nThe Gardener picks the rose.");
  assert.equal(g.run().get(), "Rose already picked, so the gardener can't pick it up anymore.");

  console.log("> Here's a little story:");
  console.log();
  g.setContext({
    rose: true,
    gardener: false
  });
  console.log(g.run().again("\n").again("\n").get());
}

{
  let context = {
    characters: [
      {
        name: "Brad",
        tired: false,
        sleeping: false
      },
      {
        name: "Jack",
        tired: true,
        sleeping: false
      }
    ]
  };
  let rules = [
    {
      name: "A",
      on: (ctx) => ctx.characters,
      test: (obj) => obj.tired && !obj.sleeping,
      action: (obj, out) => (obj.sleeping = true, out.append(`${obj.name} goes to sleep.`, " "))
    },
    {
      name: "B",
      on: (ctx) => ctx.characters,
      test: (obj) => obj.tired && obj.sleeping,
      action: (obj, out) => (obj.tired = false, out.append(`${obj.name} isn't tired anymore.`, " "))
    },
    {
      name: "C",
      on: (ctx) => ctx.characters,
      test: (obj) => !obj.tired && obj.sleeping,
      action: (obj, out) => (obj.sleeping = false, out.append(`${obj.name} wakes up.`, " "))
    },
    {
      name: "D",
      on: (ctx) => ctx.characters,
      test: (obj) => !obj.tired && !obj.sleeping,
      action: (obj, out) => (obj.tired = true, out.append(`${obj.name} is tired.`, " "))
    }
  ];
  const g = new Generative(context, rules);

  assert.equal(g.run().again("\n").again("\n").again("\n").get(), "Jack goes to sleep. Brad is tired.\nBrad goes to sleep. Jack isn't tired anymore.\nBrad isn't tired anymore. Jack wakes up.\nBrad wakes up. Jack is tired.");
}
