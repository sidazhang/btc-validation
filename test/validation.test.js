var ScriptInterpreter = require('../').ScriptInterpreter
var Transaction = require('btc-transaction').Transaction
var binConv = require('binstring');
var validation = require('../')

require('terst')

var exampleHex = '01000000010149c11ea99b6369dcd6cf9991fa0eb20a9501c7a348330e2db782e3884b9a2f000000008b483045022001c4c20a97cef3d2ff60bba1780409159e122a0b75eee99f87257a6ef3f5795e022100c5c0fd78408ebff9bc020a91e5f423994294efb18f50c2f496c4d35163acbb93014104e1934263e84e202ebffca95246b63c18c07cd369c4f02de76dbd1db89e6255dacb3ab1895af0422e24e1d1099e80f01b899cfcdf9b947575352dbc1af57466b5ffffffff01a0860100000000001976a914a5319d469e1ddd9558bd558a50e95f74b3da58c988ac00000000'

// --- test fixtures --
// exampleTx reference:
// tx
// https://helloblock.io/testnet/transactions/c68d98aaff4630ec37ca360b61a690796183e8a1b14cf123c00f0913eed6107f

// prevout
// https://helloblock.io/testnet/transactions/2f9a4b88e382b72d0e3348a3c701950ab20efa9199cfd6dc69639ba91ec14901

var prevOutHex = '01000000014263ddcb41f17814d516f594c70f9f5091bb32c2034ab20233c9b2b1b284e402000000008b483045022100d179f8d6be40c94c1c184e6c5de542da9e786e2278b3dde9c87f4f1cc582d71e022042c4b384a8b7a6de49f850aa3cf620b09601ac839e0d6cb8e8e0d5d9068a1a490141041f6222232963dc66e40f008bae27738966770a8d34d687e015b66e43e49ace2511ca6bce0df1beef080c174c6c0cf8609d51898c9e7551df0721d94758133438ffffffff01a0860100000000001976a914cf0dfe6e0fa6ea5dda32c58ff699071b672e1faf88ac00000000'

// --- test fixtures --
describe('validation', function() {
  describe('', function() {
    it('', function(done) {
      var txBuffer = binConv(exampleHex, { in : 'hex',
        out: 'buffer'
      })
      var tx = Transaction.deserialize(txBuffer)

      var prevOutBuffer = binConv(prevOutHex, { in : 'hex',
        out: 'buffer'
      })
      var txCache = {
        '2f9a4b88e382b72d0e3348a3c701950ab20efa9199cfd6dc69639ba91ec14901': Transaction.deserialize(prevOutBuffer)
      }

      validation.tx(tx, txCache, function(err, result) {
        F(err, err)
        T(result, 'This transaction should be validated')
        done()
      })
    })
  })
})
