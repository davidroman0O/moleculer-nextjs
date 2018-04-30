![Moleculer logo](http://moleculer.services/images/banner.png)

# moleculer-NextJs [![NPM version](https://img.shields.io/npm/v/moleculer-bee-queue.svg)](https://www.npmjs.com/package/moleculer-NextJs)


#   Description

Simple NextJs addon for moleculer

# Install

```bash
$ npm install moleculer-nextjs --save
```

# Note
I've not finished it yet but it worked.
See the usage, i'll make a small documentation in few days!
<<<<<<< HEAD
An example is in prepration with moleculer-socketio. 
=======
>>>>>>> 74876502e6e730e6333d987cc9e79679e29306c3

# Usage

This addons will assume that you give paths based on the root of your project.
The common folder is a sharabled components folder that will be copied inside of your project.
This way, to can have a folder that can share a lot of components to every single projects you want.


```javascript

const NextJS = require("moleculer-nextjs");

module.exports = {
	name: "www-fo",

	mixins: [ NextJS ],

	settings: {
		app: {
			name: "FrontOffice",
			dev: process.env.NODE_ENV !== 'production',
			port: 4000,
			quiet: false,
			build: true,
			conf: {
					webpack: (config, { buildId, dev, isServer, defaultLoaders }) => {
						return config;
					},
			},
			dir: "www/fo",
			common_folder: "www/common"
		}
	},

	methods: {
		onPrepare(server, app) {
			console.log("Here I can redirect to new url like the example in the documentation");
			server.get('/p/:id', (req, res) => {
				const actualPage = '/post'
				const queryParams = { id: req.params.id }
				app.render(req, res, actualPage, queryParams)
			});
		}
	},

}


<<<<<<< HEAD
```
=======
```
>>>>>>> 74876502e6e730e6333d987cc9e79679e29306c3
