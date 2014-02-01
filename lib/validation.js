var async = require('async')
var ScriptInterpreter = require('btc-scriptinterpreter').ScriptInterpreter

// todo: remove these once btc-transaction deserialize is merged
var cryptoHash = require('crypto-hashing')
var Transaction = require('btc-transaction').Transaction
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

var LEGAL_MONEY_RANGE = 21000000 * 100000000

// TODO: Move these into the btc-transaction module once deserialize is merged
// Transaction.prototype.isCoinBase = function() {
//   return this.ins.length == 1 && this.ins[0].isCoinBase();
// };
Transaction.prototype.isStandard = function() {
  var i;
  for (i = 0; i < this.ins.length; i++) {
    if (this.ins[i].script.getInType() === "Strange") {
      return false;
    }
  }
  for (i = 0; i < this.outs.length; i++) {
    if (this.outs[i].script.getOutType() === "Strange") {
      return false;
    }
  }
  return true;
};

Transaction.prototype.hash = function() {
  if (this.hash) {
    return this.hash
  }
  this.hash = binConv(cryptoHash.sha256.x2(this.serialize(), { in : 'bytes',
    out: 'bytes'
  }).reverse(), { in : 'bytes',
    out: 'hex'
  })

  return this.hash
}
// TODO: Move above

// https://en.bitcoin.it/wiki/Protocol_rules#.22tx.22_messages
me.tx = function(tx, txCache, unspentCache, callback) {
  // step 1: check syntactic correctness
  // TODO

  async.series([

      function(callback) {
        // step 2 make sure neither ins or outs are empty
        if (!isNotEmpty(tx)) {
          return callback(new Error('Inputs or Outputs should not be empty'), false)
        }
        callback(null, true)
      },
      function(callback) {
        // step 3 Size in bytes < MAX_BLOCK_SIZE
        var raw = tx.serialize()
        if (!(raw.length < MAX_BLOCK_SIZE)) {
          return callback(new Error('Tx size must be smaller than max block size'), false)
        }

        if (!(raw.length > 100)) {
          return callback(new Error('Tx size must be greater than 100 bytes. Got' + raw.length), false)
        }
        callback(null, true)
      },
      function(callback) {
        // step 4 legal money range
        // todo - implement output sum and input sum in transaction lib
        callback(null, true)
      },

      function(callback) {
        // step 5 Make sure none of the inputs have hash=0, n=-1 (coinbase transactions)
        // if (tx.isCoinBase()) {
        //   callback(new Error('Must not be a coinbase transaction'), false)
        // }
        callback(null, true)
      },

      function(callback) {
        // Step 6 Check that nLockTime <= INT_MAX[1], size in bytes >= 100[2], and sig opcount <= 2[3]
        // TODO: implement sig opcount
        if (tx.lock_time > INT_MAX) {
          return callback(new Error('lock time must be smaller than INT_MAX'), false)
        }
        callback(null, true)
      },
      function(callback) {
        // step 7: Reject "nonstandard" transactions: scriptSig doing anything other than pushing numbers on the stack, or scriptPubkey not matching the two usual forms[4]
        // todo: conditional check if it is running testnet no standardcheck
        if (!tx.isStandard()) {
          return callback(new Error('Transaction must be standard'), false)
        }
        callback(null, true)
      },
      function(callback) {
        // step 8: Reject if we already have matching tx in the pool, or in a block in the main branch
        if (txCache[tx.hash()]) {
          return callback(new Error('Transaction is already confirmed. tx_hash: ', tx.hash()), false)
        }
        callback(null, true)
      },
      function(callback) {
        // step 9: Reject if any other tx in the pool uses the same transaction output as one used by this tx
        // For each input, if the referenced output has already been spent by a transaction in the main branch, reject this transaction
        for (i in tx.ins) {
          var input = tx.ins[i]
          var isSpent = unspentCache[input.outpoint.hash + input.outpoint.index]
          if (isSpent === true) {
            // if true this means this has been spent
            return callback(new Error('Prevout is spent'), false)
          } else if (isSpent === false) {
            // if true this means this has been spent
            continue
          } else {
            throw 'Prevout missing for txHash: ' + input.outpoint.hash + ' index: ' + input.outpoint.index
          }
        }

        callback(null, true)
      },
      function(callback) {
        // step 10: For each input, look in the main branch and the transaction pool to find the referenced output transaction. If the output transaction is missing for any input, this will be an orphan transaction. Add to the orphan transactions, if a matching transaction is not in there already.
        callback(null, true)
      },
      function(callback) {
        // step 11 For each input, if we are using the nth output of the earlier transaction, but it has fewer than n+1 outputs, reject this transaction
        for (i in tx.ins) {
          var input = tx.ins[i]
          var prevOut = txCache[input.outpoint.hash]
          if (input.outpoint.index > prevOut.outs.length) {
            return callback('Referenced index is greater than the number of outputs in the referenced tx', false)
          }
        }

        callback(null, true)
      },
      function(callback) {
        // step 12: For each input, if the referenced output transaction is coinbase (i.e. only 1 input, with hash=0, n=-1), it must have at least COINBASE_MATURITY (100) confirmations; else reject this transaction
        callback(null, true)
      },
      function(callback) {
        // step 13 verify signatures
        verifySignatures(tx, txCache, callback)
      }
    ],
    function(err, results) {
      if (err) return callback(err, null);
      callback(null, results)
    })

};

function isNotEmpty(tx) {
  return (tx.ins.length > 0 && tx.outs.length > 0)
}

function verifySignatures(tx, txCache, callback) {
  for (i in tx.ins) {
    var input = tx.ins[i]
    input.index = i
  }

  async.map(tx.ins, function(input, callback) {
    var scriptSig = input.script

    var prevOut = txCache[input.outpoint.hash]
    var sig = scriptSig.chunks[0]
    var hashType = sig[sig.length - 1]

    ScriptInterpreter.verify(scriptSig, prevOut.outs[input.outpoint.index].script, tx, parseInt(input.index), hashType, function(e, result) {
      callback(e, result)
    })

  }, function(err, results) {
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
