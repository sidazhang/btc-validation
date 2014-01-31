var async = require('async')
var ScriptInterpreter = require('btc-scriptinterpreter').ScriptInterpreter
var binConv = require('binstring');
var me = module.exports;

// maximum size of a block (in bytes)
var MAX_BLOCK_SIZE = 1000000

// maximum number of signature operations in a block
var MAX_BLOCK_SIGOPS = MAX_BLOCK_SIZE / 50

// maximum integer value
var INT_MAX = 0xffffffff

// number of confirmations required before coinbase tx can be spent
var COINBASE_MATURITY = 100

// interval (in blocks) for difficulty retarget
var RETARGET = 2016

// interval (in blocks) for mining reward reduction
var REWARD_DROP = 210000


me.tx = function(tx, prevOuts, callback) {
  // step 1: check syntactic correctness
  // TODO

  // step 2 make sure neither ins or outs are empty
  if (!isNotEmpty(tx)) {
    throw 'Inputs or Outputs should not be empty'
  }

  // step 3

  // step 13 verify signatures
  verifySignatures(tx, prevOuts, function(err, result) {
    if (err) return callback(err, null)
    callback(null, result)
  })
};

function isNotEmpty(tx) {
  return (tx.ins.length > 0 && tx.outs.length > 0)
}


function verifySignatures(tx, prevOuts, callback) {
  for (i in tx.ins) {
    var input = tx.ins[i]
    input.index = i
  }

  async.map(tx.ins, function(input, callback) {
    var scriptSig = input.script

    var prevOut = prevOuts[input.outpoint.hash]
    var sig = scriptSig.chunks[0]
    var hashType = sig[sig.length-1]

    ScriptInterpreter.verify(scriptSig, prevOut.outs[input.outpoint.index].script, tx, parseInt(input.index), hashType, function(e, result) {
      callback(e, result)
    })

  }, function(err, results){
    if (err) return callback(err, null);
    noBadSig = true
    results.forEach(function(result) {
      console.log("result", result)
      if (!result) {
        badSig = false
      }
    })

    callback(null, noBadSig)
  });

}
