const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("AlphaModule", (m) => {

  const alpha = m.contract("AlphaV4");

  return { alpha };
});
