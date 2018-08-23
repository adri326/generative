/* Garden: grow your flowers!

This tiny simulation simulates the effect of the weather on your garden.
Sunny weather will make the flowers grow, while cloudy weather will privilege grass.

This describes a chaotic system, having a too high decay means that you'll very likely end up with only grass, having a too low weather randomness compared to the growth and decay will tend the system to either finish with only flowers or only grass.
*/

const Generative = require("../index");

let growth = 0.03, decay = 0.03, iterations = 100, wrand = 0.4;

let garden = {
  tiles: Array.apply(null, new Array(8))
    .map(_ => Array.apply(null, new Array(8))
      .map(_ => {
        let grass = Math.random();
        return {
          grass,
          flowers: 1 - grass
        }
      })
    ),
  weather: 1 // 0: cloudy -> 1: sunny
}

let rules = [
  {
    name: "weather",
    test: true,
    action: (ctx) => ctx.weather = Math.min(Math.max(ctx.weather + (Math.random() - .5) * 2 * wrand, 0), 1)
  },
  {
    name: "flower decay",
    on: [(ctx) => ctx.tiles, (tiles) => tiles], // select every row, then every tile
    test: true,
    action: (tile, _, ctx) => {
      tile.grass = Math.min(Math.max(
        tile.grass + Math.random() * (1 - ctx.weather) ** 2 * decay,
      0), 1);
      tile.flowers = 1 - tile.grass;
    }
  },
  {
    name: "flower growth",
    on: [(ctx) => ctx.tiles, (tiles) => tiles],
    test: true,
    action: (tile, _, ctx) => {
      tile.flowers = Math.min(Math.max(
        tile.flowers + Math.random() * ctx.weather ** 2 * growth,
      0), 1);
      tile.grass = 1 - tile.flowers;
    }
  }
];

console.log("> Variables:");
console.log("Iterations:", iterations);
console.log("Flower growth:", growth);
console.log("Flower decay:", decay);
console.log("Weather randomness:", wrand);
console.log("");

let generative = new Generative(garden, rules);
let results = [];
for (let t = 0; t < iterations; t++) {
  generative.run();
  if (t%Math.ceil(iterations/24) === 0) {
    let flowers = garden.tiles.reduce((acc, row) => acc + row.reduce((_acc, tile) => _acc + (tile.flowers > tile.grass), 0), 0);
    let weather = garden.weather;
    results.push({flowers, weather});
  }
}

console.log("> Over time:");
console.log("Weather:", results.map(({weather}) =>
  weather.toFixed(2).slice(2)
).join(" "));

console.log("Flowers:", results.map(({flowers}) =>
  flowers < 10 ? "0"+(flowers || "0") : flowers
).join(" "));

console.log("");
console.log("> Final state:")

console.log(garden.tiles.map(_ => _.map(t => {
  if (t.grass > t.flowers) return "g";
  return "f";
}).join(" ")).join("\n"));

let flowers = garden.tiles.reduce((acc, row) => acc + row.reduce((_acc, tile) => _acc + (tile.flowers > tile.grass), 0), 0);

console.log("Flowers:", flowers, "/ 64");
