module.exports = {
  presets: [
    [
      "next/babel",
      {
        "preset-env": {
          targets: {
            safari: "5.1",
            ios: "5.1",
          },
          modules: false,
        },
      },
    ],
  ],
};
