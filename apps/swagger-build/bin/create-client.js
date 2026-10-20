/* eslint-disable @typescript-eslint/no-require-imports */

// const dotenv = require('dotenv');
// dotenv.config({ path: '../../../.env.local' })
// console.log(process.env)

const { generateApi } = require('swagger-typescript-api');
const path = require('path');
const fs = require('fs');
const spec = require('../swagger.json');

generateApi({
	name: 'Api.ts',
	spec,
	httpClientType: 'fetch',
	defaultResponseAsSuccess: true,
	generateClient: true,
	generateResponses: true,
	extractRequestBody: true,
	extractResponseBody: true,
	extractResponses: true,
	unwrapResponseData: true,
	extractEnums: true,
	defaultResponseType: 'void',
	cleanOutput: true,
	sortTypes: true,
	// extractRequestParams: true,
	hooks: {
		onCreateRouteName: (routeNameInfo, rawRouteInfo) => {
			// console.log('Route name info', {routeNameInfo, rawRouteInfo})
			const routeName = {
				usage: rawRouteInfo.operationId,
				original: rawRouteInfo.operationId,
				duplicate: false,
			};
			return routeName;
		},
	},
	extractingOptions: {
		// requestBodyNameResolver: (name, reservedNames) => {
		//     console.log('Request body name', { name, reservedNames})
		//     return name
		// },
		// responseBodyNameResolver: (name, reservedNames) => {},
		// requestParamsNameResolver: (name, reservedNames) => string | undefined;
	},
})
	.then(({ files }) => {
		const file = files[0];
		let content = file.fileContent; //.replaceAll('query: query,', 'query: query.query,')
		const matches = [...file.fileContent.matchAll(/\s*query: {\s*query:\s([a-zA-Z]*);\s*},/g)];
		for (const m of matches) {
			content = content.replace(m[0], `\nquery: ${m[1]},`);
		}
		content = content.replace(
			'if (!response.ok) throw data;',
			`if (!response.ok) throw data.error`,
		);
		// content = content.replace('return data.data', 'return (await data.json())');
		content = content.replace('...requestParams,', '...requestParams,\ncredentials:"include",');

		fs.writeFileSync(path.resolve(__dirname, '../../../packages/client/src/Api.ts'), content);
	})
	.catch(e => console.error(e));
