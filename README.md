![Moleculer logo](http://moleculer.services/images/banner.png)

# moleculer-NextJs [![NPM version](https://img.shields.io/npm/v/moleculer-bee-queue.svg)](https://www.npmjs.com/package/moleculer-NextJs)


#   Description

It's time to have SSR on Moleculer! 

# Installation

##	Step 0 : your www folder

At the root of your project, create a `www` folder.
Inside of this folder, you will create new folders for your NextJs websites!

## Step 1 : Command line

moleculer-nextjs depends on next, so you have to install it too!

Note: install the same version of the addon. I'll update the next line for every updates!

```bash
$ npm install next@6.0.4-canary.8 moleculer-nextjs --save
```

##	Step 2 : Package

Inside of your package.json, you should add this line inside of the `scripts` object.

```
"build-nextjs": "node ./node_modules/moleculer-nextjs/src/nextjs-builder --web ./www",
```

Then, edit your `start` script by adding `npm run build-nextjs &&` before firing the command that start your server.

##	Step 3 : Babel!

Make sure to have a `.babelrc.js` file at the root of your NextJs project folder.

Here a sample one:

```
//	.babelrc.js
const babel = {
	presets: [
		'next/babel'
	]
}
module.exports =  babel;

```

You can edit your own settings later :)

##	Step 4 : environment

Make sure to have a `env-config.js` file at the root of your NextJs project folder.


Like this :

```
//	env-config.js
const prod = process.env.NODE_ENV === 'production'

module.exports = {
	'process.env.NODE_ENV': process.env.NODE_ENV,
}

```

# Note

I've not finished it yet but it worked.
See the usage, i'll make a small documentation in few days!

#	Example

If you want to see an example, I made a socket-io + nextjs + moleculer repo here : 

https://github.com/davidroman0O/moleculer-nextjs-socketio-example


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
		name: "FrontOffice",
		dev: process.env.NODE_ENV !== 'production',
		port: 4000,
		conf: {
				webpack: (config, { buildId, dev, isServer, defaultLoaders }) => {
					return config;
				},
		},
		dir: "www/fo",
		//	It's a common folder inside of your www folder that's contain every React components you want to share between every services that refer it
		common_folder: "www/common"
	},

	//	Better route declaration !
	routes: {
		"/blog/:slug": function(req, res) {
			const actualPage = '/blog';
			const queryParams = { slug: req.params.slug }
			this.app.render(req, res, actualPage, queryParams);
		},
		"/notFound": function(req, res) {
			res.send('Hello World!');
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

