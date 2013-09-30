var crypto			= require('crypto');
var _sequenceNumber	= null;

module.exports = function() {
	var rand = new Buffer(15);
	if (!rand.writeInt32BE)
		return Math.abs(Math.random() * Math.random() * Date.now() | 0).toString() + Math.abs(Math.random() * Math.random() * Date.now() | 0).toString();
	_sequenceNumber = (_sequenceNumber + 1) | 0;
	rand.writeInt32BE(_sequenceNumber, 11);
	if (crypto.randomBytes)
		crypto.randomBytes(12).copy(rand);
	else
		[0, 4, 8].forEach(function(i) { rand.writeInt32BE(Math.random() * Math.pow(2, 32) | 0, i); });
	return rand.toString('base64').replace(/\//g, '_').replace(/\+/g, '-');
}