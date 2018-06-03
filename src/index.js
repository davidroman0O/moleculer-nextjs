/*
 * moleculer-nextjs
 */

 "use strict";

const express = require("express");
const next = require('next');
const { exec } = require('child_process');
const path = require("path");
const fs = require('fs');
const ncp = require('ncp').ncp;

const LRUCache = require('lru-cache')
const del = require('del');


/**
*  Mixin service for Nextjs
*	Allow sync for common folder of React components, must be synced not refered
* @name moleculer-next
* @module Service
*/
module.exports = {
	name: "next",

	/**
	 * Methods
	 */
	methods: {

		getRoutes(stack) {
	        const routes = (stack || [])
	                // We are interested only in endpoints and router middleware.
	                .filter(it => it.route || it.name === 'router')
	                // The magic recursive conversion.
	                .reduce((result, it) => {
	                        if (! it.route) {
	                                // We are handling a router middleware.
	                                const stack = it.handle.stack
	                                const routes = this.getRoutes(stack)

	                                return result.concat(routes)
	                        }

	                        // We are handling an endpoint.
	                        const methods = it.route.methods
	                        const path = it.route.path

	                        const routes = Object
	                                .keys(methods)
	                                .map(m => [ m.toUpperCase(), path ])

	                        return result.concat(routes)
	                }, [])
	                // We sort the data structure by route path.
	                .sort((prev, next) => {
	                        const [ prevMethod, prevPath ] = prev
	                        const [ nextMethod, nextPath ] = next

	                        if (prevPath < nextPath) {
	                                return -1
	                        }

	                        if (prevPath > nextPath) {
	                                return 1
	                        }

	                        return 0
	                })

	        return routes
		},

		infoAboutRoutes(app) {
		        const entryPoint = app._router && app._router.stack
		        const routes = this.getRoutes(entryPoint)

		        const info = routes
		                .reduce((result, it) => {
		                        const [ method, path ] = it

		                        return result + `${method.padEnd(6)} ${path}\n`
		                }, '')

		        return info
		},


		matchRoutes(server, app, handle) {
			return new Promise((resolve, reject) => {
				if (!this.schema.hasOwnProperty("routes")) {
					this.logger.info("NextJs - No routes");
					resolve();
				}

				const routes = this.schema.routes;

				// this.logger.info("NextJs - There are routes");

				Object.keys(routes).forEach((key) => {
					const callback = routes[key];
					// this.logger.info("NextJs - Route ", key, " connected");
					//	TODO: add broker to make something better
					server.get(key, callback.bind({ cache: this.settings.hasOwnProperty("cache"), server, app, handle, renderAndCache: this.renderAndCache.bind(this) }));
				});

				resolve();
			});
		},

		copyCommonFolder(source, destination) {
			return new Promise((resolve, reject) => {
				ncp(source, destination, (err) => {
					if (err) {
						console.error(err);
						reject(err);
					} else {
						this.logger.info(this.schema.settings.name, " - Sync Common folder", new Date());
						resolve();
					}
				});
			});
		},

		removeCommonFolder(destination) {
			//	It's 2018, use del
			return del([ destination ])
					.then(() => {
						this.logger.info(this.schema.settings.name, " - Remove old common folder", new Date());
					});
		},

		//	Watch and copy common folder
		watchCommonAndCopy(source, destination) {
			return new Promise((resolve, reject) => {
				this.logger.info(this.schema.settings.name, " - Watch ", source);
				fs.watch(source, { recursive: true }, (eventType, filename) => {
					this.logger.info(this.schema.settings.name, " - Wach Common changes");
					this.copyCommonFolder(source, destination);
				});
				resolve();
			});
		},


		/*
		* NB: make sure to modify this to take into account anything that should trigger
		* an immediate page change (e.g a locale stored in req.session)
		*/
		getCacheKey (req) {
			return `${req.url}`
		},

		async renderAndCache (req, res, pagePath, queryParams) {
			const key = this.getCacheKey(req)

			// If we have a page in the cache, let's serve it
			if (this.cache_settings && this.cache_settings.hasOwnProperty(key)) {
				res.setHeader('x-cache', 'HIT')
				res.send(this.cache_settings.get(key))
				return;
			}

			try {
				// If not let's render the page into HTML
				const html = await this.app.renderToHTML(req, res, pagePath, queryParams)

				// Something is wrong with the request, let's skip the cache
				if (res.statusCode !== 200) {
					res.send(html)
					return
				}

				// Let's cache this page
				this.cache_settings.set(key, html)

				res.setHeader('x-cache', 'MISS')
				res.send(html)
			} catch (err) {
				this.app.renderError(err, req, res, pagePath, queryParams)
			}
		},

		start(params) {
			return new Promise((resolve, reject) => {
				const app = next(
					params
				);
				this.app = app;

				this.cache_settings = undefined;

				if (this.schema.settings.cache) {
					this.cache_settings = new LRUCache({
						max: this.schema.settings.cache.max,
						maxAge: this.schema.settings.cache.maxAge
					});
				}

				const handle = this.app.getRequestHandler()

				this.app.prepare()
				.then(() => {

					const server = express();
					this.server = server;

					if (this.schema.methods.hasOwnProperty("onPrepare")) {
						this.schema.methods.onPrepare(server, app);
					}

					this.matchRoutes(this.server, app, handle)
					.then(() => {

						//	Basic handle request
						server.get('*', (req, res) => {
							return handle(req, res);
						});

						const getRoutes = require('get-routes');
						const routes = getRoutes(server);

						routes["get"].map((route) => {
							this.logger.info("NextJs - ", route);
						});

						server.listen(this.schema.settings.port, (err) => {
							if (err) {
								this.logger.error(this.schema.settings.name, " - error", err);
								throw err
							}
							this.logger.info(this.schema.settings.name, " - Ready on ", `port ${this.schema.settings.port}`);
							resolve();
						})

					});

				})
				.catch((e) => {
					// console.log("error", e);
					this.logger.error(this.schema.settings.name, " - error", e);
					reject(e);
				});

			})
		}
	},

	/**
	 * Service created lifecycle event handler
	 */
	created() {
		const baseFolder = path.dirname(process.mainModule.filename);
		const dir = path.join(baseFolder, this.schema.settings.dir);

		const whenReadyToStart = () => {
			this.logger.info(this.schema.settings.name, " - created");

			const params = Object.assign(this.schema.settings, { dir });

			this.logger.info("NextJs params - ", params);

			this.start(params)
			.then(() => {
				this.logger.info(this.schema.settings.name, "Success start NextJS", this.schema.settings.dir);
			})
			.catch((e) => {
				this.logger.error(this.schema.settings.name, "Failed to start NextJS", e);
			});
		};

		if (this.schema.settings.common_folder) {

			let commonFolder = path.join(baseFolder, this.schema.settings.common_folder || "");
			let commonFolderName = commonFolder.split("/")[ commonFolder.split("/").length - 1 ];
			let dirCommonFolder = path.join(baseFolder, this.schema.settings.dir, commonFolderName);

			this.logger.info(
				this.schema.settings.name,
				`\nNextJS Directory : ${dir}`,
				`\nCommon Folder Directory : ${commonFolder}`,
				`\nNextJS Common Folder Directory : ${dirCommonFolder}`
			);

			this.removeCommonFolder(dirCommonFolder)
				.then(() => this.copyCommonFolder(commonFolder, dirCommonFolder))
				.then(() => {
					if (this.schema.settings.dev) {
						this.logger.info(this.schema.settings.name, "Watcher common and copy", commonFolder, dirCommonFolder);
						return this.watchCommonAndCopy(commonFolder, dirCommonFolder)
						.then(() => {
							this.logger.info(this.schema.settings.name, "Success sync common folder", this.schema.settings.common_folder);
						})
						.catch((e) => {
							this.logger.error(this.schema.settings.name, "Failed to sync common folder", e);
						});
					} else {
						this.logger.info(this.schema.settings.name, "No Watcher common");
						return Promise.resolve();
					}
				})
				.then(() => {
					whenReadyToStart();
				});

		} else {
			whenReadyToStart();
		}


	},

	/**
	 * Service started lifecycle event handler
	 */
	started() {

	},

	/**
	 * Service stopped lifecycle event handler
	 */
	stopped() {

	}
};
