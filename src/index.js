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
					server.get(key, callback.bind({server, app, handle}));
				});

				resolve();
			});
		},

		copyCommonFolder(source, destination) {
			ncp(source, destination, (err) => {
				if (err) {
					console.error(err);
					return err;
				}
				this.logger.info(this.schema.settings.app.name, " - Sync Common folder", new Date());
			});
		},

		//	Watch and copy common folder
		watchCommonAndCopy(source, destination) {
			return new Promise((resolve, reject) => {
				this.logger.info(this.schema.settings.app.name, " - Watch ", source);
				fs.watch(source, { recursive: true }, (eventType, filename) => {
					this.logger.info(this.schema.settings.app.name, " - Wach Common changes");
					this.copyCommonFolder(source, destination);
				});
				resolve();
			});
		},

		start(params) {
			return new Promise((resolve, reject) => {
				const app = next(
					params
				);
				this.app = app;

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

						server.listen(this.schema.settings.app.port, (err) => {
							if (err) {
								this.logger.error(this.schema.settings.app.name, " - error", err);
								throw err
							}
							this.logger.info(this.schema.settings.app.name, " - Ready on ", `port ${this.schema.settings.app.port}`);
							resolve();
						})

					});

				})
				.catch((e) => {
					// console.log("error", e);
					this.logger.error(this.schema.settings.app.name, " - error", e);
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
		const dir = path.join(baseFolder, this.schema.settings.app.dir);

		if (this.schema.settings.app.common_folder) {

			let commonFolder = path.join(baseFolder, this.schema.settings.app.common_folder || "");
			let commonFolderName = commonFolder.split("/")[ commonFolder.split("/").length - 1 ];
			let dirCommonFolder = path.join(baseFolder, this.schema.settings.app.dir, commonFolderName);

			this.logger.info(
				this.schema.settings.app.name,
				`\nNextJS Directory : ${dir}`,
				`\nCommon Folder Directory : ${commonFolder}`,
				`\nNextJS Common Folder Directory : ${dirCommonFolder}`
			);

			this.copyCommonFolder(commonFolder, dirCommonFolder);

			if (this.schema.settings.app.dev) {
				this.logger.info(this.schema.settings.app.name, "Watcher common and copy", commonFolder, dirCommonFolder);
				this.watchCommonAndCopy(commonFolder, dirCommonFolder)
				.then(() => {
					this.logger.info(this.schema.settings.app.name, "Success sync common folder", this.schema.settings.app.common_folder);
				})
				.catch((e) => {
					this.logger.error(this.schema.settings.app.name, "Failed to sync common folder", e);
				});
			} else {
				this.logger.info(this.schema.settings.app.name, "No Watcher common");
			}
		}


		this.logger.info(this.schema.settings.app.name, " - created");

		this.start(
			Object.assign(this.schema.settings.app, {
				dir
			})
		)
		.then(() => {
			this.logger.info(this.schema.settings.app.name, "Success start NextJS", this.schema.settings.app.dir);
		})
		.catch((e) => {
			this.logger.error(this.schema.settings.app.name, "Failed to start NextJS", e);
		});
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
