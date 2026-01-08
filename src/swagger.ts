import path from 'path';

/**
 * Swagger configuration for OpenAPI specification
 * Defines API documentation, schemas, and security schemes
 */
export const swaggerOptions = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'Hookah Tobacco Database API',
			version: '1.0.0',
			description:
				'ReSTful API for accessing hookah tobacco brands and flavors data from htreviews.org. ' +
				'This API provides comprehensive information about tobacco products including brands, flavors, ' +
				'ratings, reviews, and detailed product metadata.',
			contact: {
				name: 'API Support',
				email: 'support@hookah-db.com',
			},
		},
		servers: [
			{
				url: 'http://localhost:3000',
				description: 'Development server',
			},
			{
				url: 'https://hdb.coolify.dknas.org',
				description: 'Production server',
			},
		],
		components: {
			securitySchemes: {
				ApiKeyAuth: {
					type: 'apiKey',
					in: 'header',
					name: 'X-API-Key',
					description: 'API key for authentication. Include your API key in the X-API-Key header.',
				},
			},
			schemas: {
				/**
				 * Brand schema representing a hookah tobacco brand
				 */
				Brand: {
					type: 'object',
					properties: {
						slug: {
							type: 'string',
							description: 'Unique identifier for the brand',
							example: 'sarma',
						},
						name: {
							type: 'string',
							description: 'Brand display name in original language',
							example: 'Сарма',
						},
						nameEn: {
							type: 'string',
							description: 'Brand name in English',
							example: 'Sarma',
						},
						description: {
							type: 'string',
							description: 'Brand description',
							example: 'Russian hookah tobacco brand known for classic flavors',
						},
						country: {
							type: 'string',
							description: 'Country of origin',
							example: 'Россия',
						},
						website: {
							type: 'string',
							description: 'Official website URL',
							example: 'https://sarma-tobacco.ru',
						},
						foundedYear: {
							type: 'integer',
							description: 'Year the brand was founded',
							example: 2015,
						},
						status: {
							type: 'string',
							enum: ['Выпускается', 'Снят с производства'],
							description: 'Production status',
							example: 'Выпускается',
						},
						imageUrl: {
							type: 'string',
							description: 'URL to brand logo image',
							example: 'https://example.com/images/sarma-logo.jpg',
						},
						rating: {
							type: 'number',
							format: 'float',
							description: 'Average rating (1-5)',
							example: 4.5,
						},
						ratingsCount: {
							type: 'integer',
							description: 'Total number of ratings',
							example: 150,
						},
						reviewsCount: {
							type: 'integer',
							description: 'Total number of reviews',
							example: 89,
						},
						viewsCount: {
							type: 'integer',
							description: 'Total number of views',
							example: 12500,
						},
						lines: {
							type: 'array',
							description: 'Product lines belonging to this brand',
							items: {
								$ref: '#/components/schemas/Line',
							},
						},
						flavorsCount: {
							type: 'integer',
							description: 'Total number of flavors',
							example: 25,
						},
					},
					required: ['slug', 'name', 'nameEn', 'status', 'rating'],
				},

				/**
				 * Flavor schema representing a hookah tobacco flavor
				 */
				Flavor: {
					type: 'object',
					properties: {
						slug: {
							type: 'string',
							description: 'Unique identifier for the flavor (brand/line/flavor)',
							example: 'sarma/klassicheskaya/zima',
						},
						name: {
							type: 'string',
							description: 'Flavor display name in original language',
							example: 'Зима',
						},
						nameAlt: {
							type: 'string',
							description: 'Alternative name (e.g., English translation)',
							example: 'Winter',
						},
						description: {
							type: 'string',
							description: 'Flavor description',
							example: 'Mint and menthol flavor with cooling sensation',
						},
						brandSlug: {
							type: 'string',
							description: 'Parent brand slug',
							example: 'sarma',
						},
						brandName: {
							type: 'string',
							description: 'Parent brand name',
							example: 'Сарма',
						},
						lineSlug: {
							type: 'string',
							description: 'Parent line slug',
							example: 'klassicheskaya',
						},
						lineName: {
							type: 'string',
							description: 'Parent line name',
							example: 'Классическая',
						},
						country: {
							type: 'string',
							description: 'Country of origin',
							example: 'Россия',
						},
						officialStrength: {
							type: 'string',
							description: 'Official strength level',
							example: 'Средняя',
						},
						userStrength: {
							type: 'string',
							description: 'User-rated strength level',
							example: 'Средняя',
						},
						status: {
							type: 'string',
							enum: ['Выпускается', 'Снят с производства'],
							description: 'Production status',
							example: 'Выпускается',
						},
						imageUrl: {
							type: 'string',
							description: 'URL to flavor image',
							example: 'https://example.com/images/zima.jpg',
						},
						tags: {
							type: 'array',
							description: 'Flavor tags/characteristics',
							items: {
								type: 'string',
							},
							example: ['Холодок', 'Мята', 'Освежающий'],
						},
						rating: {
							type: 'number',
							format: 'float',
							description: 'Average rating (1-5)',
							example: 4.7,
						},
						ratingsCount: {
							type: 'integer',
							description: 'Total number of ratings',
							example: 320,
						},
						reviewsCount: {
							type: 'integer',
							description: 'Total number of reviews',
							example: 156,
						},
						viewsCount: {
							type: 'integer',
							description: 'Total number of views',
							example: 8500,
						},
						ratingDistribution: {
							$ref: '#/components/schemas/RatingDistribution',
						},
						smokeAgainPercentage: {
							type: 'number',
							format: 'float',
							description: 'Percentage of users who would smoke again',
							example: 85.5,
						},
						htreviewsId: {
							type: 'integer',
							description: 'Internal HTReviews ID',
							example: 12345,
						},
						dateAdded: {
							type: 'string',
							format: 'date-time',
							description: 'Date when flavor was added to HTReviews',
							example: '2024-01-15T10:30:00Z',
						},
						addedBy: {
							type: 'string',
							description: 'User who added the flavor',
							example: 'user123',
						},
					},
					required: ['slug', 'name', 'brandSlug', 'brandName', 'status', 'rating'],
				},

				/**
				 * Line schema representing a product line
				 */
				Line: {
					type: 'object',
					properties: {
						slug: {
							type: 'string',
							description: 'Unique identifier for the line',
							example: 'klassicheskaya',
						},
						name: {
							type: 'string',
							description: 'Line display name',
							example: 'Классическая',
						},
						description: {
							type: 'string',
							description: 'Line description',
							example: 'Classic tobacco line with traditional flavors',
						},
						strength: {
							type: 'string',
							enum: ['Лёгкая', 'Средняя', 'Крепкая'],
							description: 'Strength level',
							example: 'Средняя',
						},
						status: {
							type: 'string',
							enum: ['Выпускается', 'Снят с производства'],
							description: 'Production status',
							example: 'Выпускается',
						},
						flavorsCount: {
							type: 'integer',
							description: 'Number of flavors in this line',
							example: 10,
						},
						rating: {
							type: 'number',
							format: 'float',
							description: 'Average rating (1-5)',
							example: 4.3,
						},
						brandSlug: {
							type: 'string',
							description: 'Parent brand slug',
							example: 'sarma',
						},
					},
					required: ['slug', 'name', 'strength', 'status', 'rating'],
				},

				/**
				 * RatingDistribution schema for rating statistics
				 */
				RatingDistribution: {
					type: 'object',
					description: 'Distribution of ratings by score (1-5)',
					properties: {
						'1': {
							type: 'integer',
							description: 'Number of 1-star ratings',
							example: 5,
						},
						'2': {
							type: 'integer',
							description: 'Number of 2-star ratings',
							example: 3,
						},
						'3': {
							type: 'integer',
							description: 'Number of 3-star ratings',
							example: 12,
						},
						'4': {
							type: 'integer',
							description: 'Number of 4-star ratings',
							example: 45,
						},
						'5': {
							type: 'integer',
							description: 'Number of 5-star ratings',
							example: 255,
						},
					},
					required: ['1', '2', '3', '4', '5'],
				},

				/**
				 * Error schema for API error responses
				 */
				Error: {
					type: 'object',
					properties: {
						message: {
							type: 'string',
							description: 'Error message describing what went wrong',
							example: 'Brand not found',
						},
						status: {
							type: 'integer',
							description: 'HTTP status code',
							example: 404,
						},
					},
					required: ['message', 'status'],
				},

				/**
				 * Pagination schema for paginated responses
				 */
				Pagination: {
					type: 'object',
					properties: {
						page: {
							type: 'integer',
							description: 'Current page number (1-indexed)',
							example: 1,
						},
						limit: {
							type: 'integer',
							description: 'Number of items per page',
							example: 20,
						},
						total: {
							type: 'integer',
							description: 'Total number of items',
							example: 150,
						},
						totalPages: {
							type: 'integer',
							description: 'Total number of pages',
							example: 8,
						},
					},
					required: ['page', 'limit', 'total', 'totalPages'],
				},
			},
		},
		security: [
			{
				ApiKeyAuth: [],
			},
		],
	},
	apis: [
		// Scan route files for JSDoc comments
		path.join(__dirname, 'routes/*.ts'),
		// Scan server file for JSDoc comments
		path.join(__dirname, 'server.ts'),
	],
};

export default swaggerOptions;
