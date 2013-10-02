var Winston	= require('winston');

module.exports = function(module) {
	return new Winston.Logger({
		transports: [
			new Winston.transports.Console({
				colorize:			true,
				level:				'debug',
				label:				'dnode-spider( '+module.filename.split('/').slice(-2).join('/')+' )',
				handleExceptions:	true,
				json:				false,
			}),
		],
	});
}