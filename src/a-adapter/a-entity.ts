import { cloneDeep, get, isNil, merge, omit } from 'lodash';

import { EntityUid, IEntityAttributes, IEntityProperties } from '@diaspora/dev-typings/entity';
import { QueryLanguage } from '@diaspora/dev-typings/queryLanguage';

import { AAdapter } from '.';
import { DataAccessLayer } from '..';

/**
 * AdapterEntity is the sub-entity reflecting a single source content. Values may differ from the Entity itself.
 */
export abstract class AAdapterEntity<TSubAdapterEntity extends AAdapterEntity<TSubAdapterEntity>> {
	/**
	 * Returns all attributes of this adapterEntity.
	 * **Note:** Attributes does not include `id` nor `idHash`, that are managed. Use {@link properties} to get them.
	 *
	 * @author Gerkin
	 */
	public get attributes() {
		// TODO WARNING! Cast not OK
		return omit( this.properties, ['idHash', 'id'] );
	}

	/**
	 * Returns a copy of the object's properties.
	 *
	 * @description The adapter entity is strictly private and represent the state of the entity in the data source. Thus, it can't be modified directly.
	 * When an {@link Entity} is updated, it will retrieve new instances of this entity.
	 *
	 * @author Gerkin
	 */
	public get properties() {
		return cloneDeep( this._properties );
	}

	/**
	 * Returns the ID of the entity in a specific adapter. Shorthand getter for `this._properties.id`.
	 *
	 * @author Gerkin
	 */
	public get id() {
		return this._properties.id;
	}

	/**
	 * Applies the id in the appropriate field & id hash
	 *
	 * @author Gerkin
	 * @param attributes - Attributes of the entity
	 * @param adapter    - Adapter that will persist the entity
	 * @param propName   - Property that should contain the ID
	 * @param id         - Value of the ID
	 */
	public static setId<TAdapterEntity extends AAdapterEntity<any>>(
		attributes: IEntityAttributes,
		adapter: AAdapter<TAdapterEntity>,
		id?: EntityUid,
		propName: string = 'id',
	): IEntityProperties {
		const defaultedId = id || get( attributes, propName );
		const adapterEntityAttributes = merge( attributes, {
			id: defaultedId,
			idHash: {
				[adapter.name]: defaultedId,
			},
		} );
		return adapterEntityAttributes;
	}

	/**
	 * Is implemented only by decorator
	 *
	 * @param query Query to match entity against
	 */
	public static matches(
		attributes: IEntityAttributes,
		query: QueryLanguage.SelectQueryOrCondition,
	): boolean {
		return false;
	}
	public readonly dataSource: AAdapter<TSubAdapterEntity>;
	public readonly dataAccessLayer: DataAccessLayer<TSubAdapterEntity, AAdapter<TSubAdapterEntity>>;

	protected _properties: IEntityProperties;

	/**
	 * Construct a new data source entity with specified content & parent.
	 *
	 * @author gerkin
	 */
	public constructor( entity: IEntityProperties, dataSource: AAdapter<TSubAdapterEntity> ) {
		if ( isNil( entity ) ) {
			throw new Error( "Can't construct entity from nil value" );
		}
		if ( isNil( dataSource ) ) {
			throw new TypeError(
				`Expect 2nd argument to be the parent of this entity, have "${dataSource}"`,
			);
		}
		if ( !entity.id ) {
			throw new Error( 'Entity from adapter should have an id.' );
		}

		merge( entity, { idHash: { [dataSource.name]: entity.id } } );
		this._properties = entity;
		this.dataSource = dataSource;
		this.dataAccessLayer = DataAccessLayer.retrieveAccessLayer( dataSource );
	}

	/**
	 * Is implemented only by decorator
	 *
	 * @param query Query to match entity against
	 */
	public matches( query: QueryLanguage.SelectQueryOrCondition ): boolean {
		return false;
	}

	/**
	 * Calls the static {@link AdapterEntity.setId} with provided arguments
	 *
	 * @author Gerkin
	 * @param adapter    - Adapter that will persist the entity
	 * @param propName   - Property that should contain the ID
	 * @param id         - Value of the ID
	 */
	protected setId( adapter: AAdapter<TSubAdapterEntity>, id?: EntityUid, propName?: string ): this {
		this._properties = AAdapterEntity.setId(
			this.attributes,
			adapter,
			id,
			propName,
		);
		return this;
	}
}
