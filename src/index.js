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

		/*
			Should not be used by a nodejs application
			This could cause memory leaks in production in some case
			You should handle next build by yourself in production
		*/
		// build(dev, dir) {
		// 	return new Promise((resolve, reject) => {
		// 		if (!dev) {

		// 			const command = `( cd ${dir} && rm -rf .next && ../../node_modules/next/dist/bin/next build )`;
		// 			this.logger.info(this.schema.settings.app.name, " - Command - ", command);

		// 			setTimeout(() => {
		// 				exec(command, (err, stdout, stderr) => {
		// 					if (err) {
		// 						console.log(err, stderr);
		// 						reject(err);
		// 					}
		// 					if (stderr.length > 0) {
		// 						this.logger.info(this.schema.settings.app.name, `stderr: ${stderr}`);
		// 						reject(new Error(stderr));
		// 					}
		// 					this.logger.info(this.schema.settings.app.name, `stdout: ${stdout}`);
		// 					resolve();
		// 				});
		// 			}, 250);
		// 		} else {
		// 			this.logger.info(this.schema.settings.app.name, " - No Command");
		// 			resolve();
		// 		}
		// 		// resolve();
		// 	});
		// },

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

				const handle = app.getRequestHandler()

				app.prepare()
				.then(() => {
					const server = express();

					this.app = app;
					this.server = server;

					this.schema.methods.onPrepare(server, app);

					server.get('*', (req, res) => {
						return handle(req, res);
					});

					server.listen(this.schema.settings.app.port, (err) => {
						if (err) {
							this.logger.error(this.schema.settings.app.name, " - error", err);
							throw err
						}
						this.logger.info(this.schema.settings.app.name, " - Ready on ", `port ${this.schema.settings.app.port}`);
						resolve();
					})
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

		//	We must nextjs build before launching the nodejs app
		// let promise = undefined;

		// if (this.schema.settings.app.build) {
		// 	promise = this.build(this.schema.settings.app.dev, dir)
		// 	.then(() => {
		// 		return this.start(
		// 			Object.assign(this.schema.settings.app, {
		// 				dir
		// 			})
		// 		);
		// 	})
		// } else {
		// 	promise = this.start(
		// 		Object.assign(this.schema.settings.app, {
		// 			dir
		// 		})
		// 	);
		// }

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
