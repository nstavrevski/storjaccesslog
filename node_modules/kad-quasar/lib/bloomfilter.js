'use strict';

var kad = require('kad');
var Bloem = require('bloem').Bloem;

/**
 * Implements an Attenuated Bloom Filter
 * @constructor
 */
function BloomFilter() {
  if (!(this instanceof BloomFilter)) {
    return new BloomFilter();
  }

  this.size = kad.constants.B;
  this.depth = kad.constants.ALPHA;
  this.filters = [];

  for (var i = 0; i < this.depth; i++) {
    this.filters.push(new Bloem(this.size, 2));
  }
}

/**
 * Serializes the bloom filter into a series of hex strings
 * @returns {Array}
 */
BloomFilter.prototype.serialize = function() {
  var filters = [];

  for (var i = 0; i < this.filters.length; i++) {
    filters.push(this.filters[i].bitfield.toBuffer().toString('hex'));
  }

  return filters;
};

/**
 * Deserializes the bloom filter from a series of hex strings
 * @param {Array} filters - Array of hex encoded bloom filters
 * @returns {AttenuatedBloomFilter}
 */
BloomFilter.deserialize = function(filters) {
  var bf = new BloomFilter();

  for (var i = 0; i < filters.length; i++) {
    if (bf.filters[i]) {
      bf.filters[i].bitfield.buffer = new Buffer(filters[i], 'hex');
    } else {
      return bf;
    }
  }

  return bf;
};

module.exports = BloomFilter;
