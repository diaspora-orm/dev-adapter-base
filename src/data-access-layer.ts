import { castArray, Dictionary, forEach, isArray, isNil, map, some } from 'lodash';
import { SequentialEvent } from 'sequential-event';

import { IDataSourceQuerier } from '@diaspora/dev-typings/dataSourceQuerier';
import { IEntityAttributes, IEntityProperties } from '@diaspora/dev-typings/entity';
import { _QueryLanguage, QueryLanguage } from '@diaspora/dev-typings/queryLanguage';

import { AAdapter, AAdapterEntity } from '.';
import { EntityUid } from './entity-uid';

interface ICActionSingle {
	query?: undefined;
	options?: undefined;
	rawObj: IEntityAttributes;
}
interface ICActionArray {
	query?: undefined;
	options?: undefined;
	rawObj: IEntityAttributes[];
}
interface IRUDActionInSingle {
	query: QueryLanguage.SearchQuery;
	options: QueryLanguage.IQueryOptions;
	rawObj?: IEntityAttributes;
}
interface IRUDActionInArray {
	query: QueryLanguage.SearchQuery;
	options: QueryLanguage.IQueryOptions;
	rawObj?: IEntityAttributes[];
}
interface IRUDActionOutSingle {
	query: _QueryLanguage.SelectQueryOrCondition;
	options: _QueryLanguage.IQueryOptions;
	rawObj?: IEntityAttributes;
}
interface IRUDActionOutArray {
	query: _QueryLanguage.SelectQueryOrCondition;
	options: _QueryLanguage.IQueryOptions;
	rawObj?: IEntityAttributes[];
}
/**
 * The Data Access Layer class is the components that wraps adapter calls to provide standard inputs & outputs.
 * Typically, it casts raw query & raw query options in standard query & standard query options, and casts POJO from the output of the adapter's query in adapter entity.
 *
 * @author Gerkin
 */
export class DataAccessLayer<
	TEntity extends AAdapterEntity<TEntity>,
	TAdapter extends AAdapter<TEntity>
> extends SequentialEvent implements IDataSourceQuerier<
	TEntity,
	TEntity,
	QueryLanguage.SearchQuery | undefined,
	QueryLanguage.IQueryOptions | undefined
> {
	/**
	 * The registry containing all adapters.
	 */
	private static readonly dataAccessLayersRegistry = new WeakMap<AAdapter<any>, DataAccessLayer<any, any>>();

	/**
	 * The `name` of the underlying adapter.
	 *
	 * @see {@link AAdapter.name} The base AAdapter `name` property
	 */
	public name: string;

	/**
	 * Constructs a new instance of DataAccessLayer. This new instance is automatically registered in the registry of DataAccessLayer.
	 * You should not call this method directly, and use {@link retrieveAccessLayer} instead.
	 *
	 * @author Gekrin
	 * @param adapter - Adapter to wrap
	 */
	private constructor( private readonly adapter: TAdapter ) {
		super();
		this.name = this.adapter.name;
		DataAccessLayer.dataAccessLayersRegistry.set( adapter, this );
	}

	/**
	 * Get the access layer that wraps the provided adapter. If it does not exists, this method constructs a new instance of {@link DataAccessLayer}.
	 * This method is the only way to construct a {@link DataAccessLayer}.
	 *
	 * @author Gerkin
	 * @param adapter - Adapter to get access layer from.
	 */
	public static retrieveAccessLayer<TEntity extends AAdapterEntity<TEntity>>( adapter: AAdapter<TEntity> ): DataAccessLayer<TEntity, AAdapter<TEntity>> {
		return this.dataAccessLayersRegistry.get( adapter ) || new DataAccessLayer( adapter );
	}

	// -----
	// ### Normalize

	/**
	 * Generates a query object if the only provided parameter is an {@link EntityUid}.
	 *
	 * @param query - Entity ID or query to potentialy transform
	 */
	private static ensureQueryObject(
		query?: QueryLanguage.SearchQuery,
	): QueryLanguage.SelectQueryOrCondition {
		if ( isNil( query ) ) {
			return {};
		} else if ( EntityUid.isEntityUid( query ) ) {
			return {
				id: query,
			};
		} else {
			return query;
		}
	}

	/**
	 * Normalize the query to cast it from its most user-friendly form to a standard one.
	 * If the parameter is an ID, it will be wrapped in correct query.
	 *
	 * @author Gerkin
	 * @param originalQuery - Query to cast to its canonical form
	 * @param options       - Options to apply to the query
	 * @returns Returns the normalized query.
	 */
	private normalizeQuery(
		originalQuery: QueryLanguage.SearchQuery | undefined,
		options: _QueryLanguage.IQueryOptions,
	) {
		const canonicalQuery = DataAccessLayer.ensureQueryObject( originalQuery );
		return this.adapter.normalizeQuery( canonicalQuery, options );
	}

	/**
	 * Normalize & remaps a CRUD action input. The output can be passed to an action operator.
	 *
	 * @author Gerkin
	 * @param collectionName - Name of the collection to normalize inputs for.
	 * @param inputs         - An object containing the CRUD action inputs.
	 */
	private normalizeInputs<TCAction extends ICActionSingle | ICActionArray>( collectionName: string, inputs: TCAction ): TCAction;
	private normalizeInputs( collectionName: string, inputs: IRUDActionInSingle ): IRUDActionOutSingle;
	private normalizeInputs( collectionName: string, inputs: IRUDActionInArray ): IRUDActionOutArray;
	private normalizeInputs( collectionName: string, inputs: ICActionSingle | ICActionArray | IRUDActionInSingle | IRUDActionInArray ) {
		const retObj: {
			query?: QueryLanguage.SearchQuery;
			options?: QueryLanguage.IQueryOptions;
			rawObj?: IEntityAttributes | IEntityAttributes[];
		} = {};
		if ( inputs.query || inputs.options ) {// find, update & delete
			const optionsNormalized = this.adapter.normalizeOptions( inputs.options );
			const queryNormalized = this.normalizeQuery( inputs.query, optionsNormalized );
			retObj.options = optionsNormalized;
			retObj.query = this.adapter.remapInput( collectionName, queryNormalized );
		}
		if ( inputs.rawObj ) {// insert & update
			retObj.rawObj = ( isArray( inputs.rawObj ) ?
				map( inputs.rawObj, rawObj => this.adapter.remapInput( collectionName, rawObj ) ) :
				this.adapter.remapInput( collectionName, inputs.rawObj ) );
		}
		return retObj;
	}

	// -----
	// ### Insert

	/**
	 * Insert the provided entity in the desired collection
	 *
	 * @author Gerkin
	 * @throws Error if the insertion failed.
	 * @param collectionName - Name of the collection to insert the entity into
	 * @param entity         - Object containing the properties of the entity to insert
	 */
	public async insertOne( collectionName: string, entity: IEntityAttributes ) {
		const {rawObj: entityRemappedIn} = this.normalizeInputs( collectionName, {rawObj: entity} );
		const newEntity = await this.adapter.insertOne(
			collectionName,
			entityRemappedIn,
		);
		if ( !newEntity ) {
			throw new Error( 'The underlying adapter returned a nil value.' );
		}
		const newEntityRemappedOut = this.adapter.remapOutput( collectionName, newEntity );
		return this.adapter.makeEntity( newEntityRemappedOut );
	}

	/**
	 * Insert the provided entities in the desired collection
	 *
	 * @author Gerkin
	 * @throws Error if the insertion failed.
	 * @param collectionName - Name of the collection to insert entities into
	 * @param entities       - Array of objects containing the properties of the entities to insert
	 */
	public async insertMany(
		collectionName: string,
		entities: IEntityAttributes[],
	) {
		const {rawObj: entitiesRemappedIn} = this.normalizeInputs( collectionName, {rawObj: entities} );
		const newEntities = await this.adapter.insertMany(
			collectionName,
			entitiesRemappedIn,
		);
		if ( newEntities.length !== entitiesRemappedIn.length ) {
			throw new Error( 'The underlying adapter returned an incorrect number of inserted items.' );
		}
		if ( some( newEntities, isNil ) ) {
			throw new Error( 'The underlying adapter returned a nil value.' );
		}
		return map( newEntities, newEntity => {
			const newEntityRemapped = this.adapter.remapOutput( collectionName, newEntity );
			return this.adapter.makeEntity( newEntityRemapped );
		} );
	}

	// -----
	// ### Find

	/**
	 * Retrieve a single entity from the desired collection.
	 *
	 * @author Gerkin
	 * @param collectionName - Name of the collection to search into
	 * @param searchQuery    - Description of the entity to find
	 * @param options        - Options to apply to the query
	 */
	public async findOne(
		collectionName: string,
		searchQuery: QueryLanguage.SearchQuery = {},
		options: QueryLanguage.IQueryOptions = {},
	) {
		const {
			query: normalizedQuery,
			options: normalizedOptions,
		} = this.normalizeInputs( collectionName, {
			options,
			query: searchQuery,
		} );
		const foundEntity = await this.adapter.findOne(
			collectionName,
			normalizedQuery,
			normalizedOptions,
		);
		if ( foundEntity ) {
			const foundEntityRemapped = this.adapter.remapOutput( collectionName, foundEntity );
			return this.adapter.makeEntity( foundEntityRemapped );
		} else {
			return undefined;
		}
	}

	/**
	 * Retrieve several entities from the desired collection.
	 *
	 * @author Gerkin
	 * @param collectionName - Name of the collection to search into
	 * @param searchQuery    - Description of the entities to find
	 * @param options        - Options to apply to the query
	 */
	public async findMany(
		collectionName: string,
		searchQuery: QueryLanguage.SearchQuery = {},
		options: QueryLanguage.IQueryOptions = {},
	) {
		const {
			query: normalizedQuery,
			options: normalizedOptions,
		} = this.normalizeInputs( collectionName, {
			options,
			query: searchQuery,
		} );
		const foundEntities = await this.adapter.findMany(
			collectionName,
			normalizedQuery,
			normalizedOptions,
		);
		return map( foundEntities, foundEntity => {
			const foundEntityRemapped = this.adapter.remapOutput( collectionName, foundEntity );
			return this.adapter.makeEntity( foundEntityRemapped );
		} );
	}

	// -----
	// ### Update

	/**
	 * Update a single entity from the desired collection
	 *
	 * @author Gerkin
	 * @param collectionName - Name of the collection to update
	 * @param searchQuery    - Description of the entity to update
	 * @param update         - Properties to modify on the matched entity
	 * @param options        - Options to apply to the query
	 */
	public async updateOne(
		collectionName: string,
		searchQuery: QueryLanguage.SearchQuery | undefined = {},
		update: IEntityAttributes = {},
		options: QueryLanguage.IQueryOptions = {},
	) {
		const {
			query: normalizedQuery,
			options: normalizedOptions,
			rawObj: normalizedUpdate,
		} = this.normalizeInputs( collectionName, {
			options,
			query: searchQuery,
			rawObj: update,
		} );
		const updatedEntity = await this.adapter.updateOne(
			collectionName,
			normalizedQuery,
			normalizedUpdate as IEntityAttributes,
			normalizedOptions,
		);
		if ( updatedEntity ) {
			const updatedEntityRemapped = this.adapter.remapOutput(
				collectionName,
				updatedEntity,
			);
			return this.adapter.makeEntity( updatedEntityRemapped );
		} else {
			return undefined;
		}
	}

	/**
	 * Update entities from the desired collection
	 *
	 * @author Gerkin
	 * @param collectionName - Name of the collection to update
	 * @param searchQuery    - Description of the entities to update
	 * @param update         - Properties to modify on the matched entities
	 * @param options        - Options to apply to the query
	 */
	public async updateMany(
		collectionName: string,
		searchQuery: QueryLanguage.SearchQuery | undefined,
		update: IEntityAttributes,
		options: QueryLanguage.IQueryOptions = {},
	) {
		const {
			query: normalizedQuery,
			options: normalizedOptions,
			rawObj: normalizedUpdate,
		} = this.normalizeInputs( collectionName, {
			options,
			query: searchQuery,
			rawObj: update,
		} );
		const updatedEntities = await this.adapter.updateMany(
			collectionName,
			normalizedQuery,
			normalizedUpdate,
			normalizedOptions,
		);
		return map( updatedEntities, updatedEntity => {
			const updatedEntityRemapped = this.adapter.remapOutput(
				collectionName,
				updatedEntity,
			);
			return this.adapter.makeEntity( updatedEntityRemapped );
		} );
	}

	// -----
	// ### Delete

	/**
	 * Delete an entity from the desired collection
	 *
	 * @author Gerkin
	 * @param collectionName - Name of the collection to delete entity from
	 * @param searchQuery    - Description of the entity to delete
	 * @param options        - Options to apply to the query
	 */
	public async deleteOne(
		collectionName: string,
		searchQuery: QueryLanguage.SearchQuery | undefined = {},
		options: QueryLanguage.IQueryOptions = {},
	) {
		const {
			query: normalizedQuery,
			options: normalizedOptions,
		} = this.normalizeInputs( collectionName, {
			options,
			query: searchQuery,
		} );
		return this.adapter.deleteOne(
			collectionName,
			normalizedQuery,
			normalizedOptions,
		);
	}

	/**
	 * Delete entities from the desired collection
	 *
	 * @author Gerkin
	 * @param collectionName - Name of the collection to delete entities from
	 * @param searchQuery    - Description of the entities to delete
	 * @param options        - Options to apply to the query
	 */
	public async deleteMany(
		collectionName: string,
		searchQuery: QueryLanguage.SearchQuery | undefined = {},
		options: QueryLanguage.IQueryOptions = {},
	) {
		const {
			query: normalizedQuery,
			options: normalizedOptions,
		} = this.normalizeInputs( collectionName, {
			options,
			query: searchQuery,
		} );
		return this.adapter.deleteMany(
			collectionName,
			normalizedQuery,
			normalizedOptions,
		);
	}

	// -----
	// ### Utility

	/**
	 * Check if the collection contains at least one element matching the query.
	 *
	 * @param collectionName - Name of the collection to search entities in
	 * @param searchQuery    - Description of the entities to match
	 * @param options        - Options to apply to the query
	 */
	public async contains(
		collectionName: string,
		searchQuery: QueryLanguage.SearchQuery | undefined,
		options: QueryLanguage.IQueryOptions | undefined,
	): Promise<boolean> {
		const {
			query: normalizedQuery,
			options: normalizedOptions,
		} = this.normalizeInputs( collectionName, {
			options,
			query: searchQuery,
		} );
		return this.adapter.contains(
			collectionName,
			normalizedQuery,
			normalizedOptions,
		);
	}

	/**
	 * Get the number of elements in a collection matching the query.
	 *
	 * @param collectionName - Name of the collection to search entities in
	 * @param searchQuery    - Description of the entities to match
	 * @param options        - Options to apply to the query
	 */
	public async count(
		collectionName: string,
		searchQuery: QueryLanguage.SearchQuery | undefined = {},
		options: QueryLanguage.IQueryOptions | undefined = {},
	): Promise<number> {
		const {
			query: normalizedQuery,
			options: normalizedOptions,
		} = this.normalizeInputs( collectionName, {
			options,
			query: searchQuery,
		} );
		return this.adapter.count(
			collectionName,
			normalizedQuery,
			normalizedOptions,
		);
	}

	/**
	 * Check if every elements in the collection matches the query.
	 *
	 * @param collectionName - Name of the collection to search entities in
	 * @param searchQuery    - Description of the entities to match
	 * @param options        - Options to apply to the query
	 */
	public async every(
		collectionName: string,
		searchQuery: QueryLanguage.SearchQuery | undefined = {},
		options: QueryLanguage.IQueryOptions | undefined = {},
	): Promise<boolean> {
		const {
			query: normalizedQuery,
			options: normalizedOptions,
		} = this.normalizeInputs( collectionName, {
			options,
			query: searchQuery,
		} );
		return this.adapter.every(
			collectionName,
			normalizedQuery,
			normalizedOptions,
		);
	}

	// -----
	// ### Various

	/**
	 * Waits for the underlying adapter to be ready.
	 *
	 * @author Gerkin
	 * @see Adapter.waitReady
	 */
	public async waitReady() {
		await this.adapter.waitReady();
		return this;
	}

	/**
	 * Saves the remapping table, the reversed remapping table and the filter table in the adapter. Those tables will be used later when manipulating models & entities.
	 *
	 * @author gerkin
	 * @param collectionName - Name of the collection
	 * @param remaps         - Remappings to apply on properties
	 * @param filters        - Filters to apply on properties
	 */
	public configureCollection(
		collectionName: string,
		remaps: Dictionary<string> = {},
		filters: Dictionary<any> = {},
	) {
		this.adapter.configureCollection( collectionName, remaps, filters );
		return this;
	}
}

export type TDataSource<TEntity extends AAdapterEntity<TEntity>>  = string | AAdapter<TEntity> | DataAccessLayer<TEntity, AAdapter<TEntity>>;
