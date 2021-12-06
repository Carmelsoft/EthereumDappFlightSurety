var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "blanket seat father cloth gallery shiver foam floor retreat hockey have bulk";

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*" // Match any network id
    }
  },
  compilers: {
    solc: {
      version: "^0.4.24"
    }
  }
};
