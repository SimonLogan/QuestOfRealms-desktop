/**
 * Created by Simon on 16/04/2017.
 * (c) Simon Logan
 */

module.exports = {

  category: "item",
  attributes: {
    "long sword": {
      use: "weapon",
      image: "longsword.png",
      description: "Useful against more powerful or armoured opponents.",
      damage: 10
    },
    "short sword": {
      use: "weapon",
      image: "shortsword.png",
      description: "Useful for close-quarters combat. Easily concealed.",
      damage: 5
    },
    "spear": {
      use: "weapon",
      image: "spear.png",
      description: "medium range weapon.",
      damage: 10
    },
    "coin": {
      use: "buy",
      image: "coin.png",
      description: "coin."
    },
    "food": {
      use: "food",
      image: "apple.png",
      description: "food."
    }
  }
};

