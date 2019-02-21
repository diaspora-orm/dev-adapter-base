import { get, merge } from 'lodash';

import { EntityUid, IEntityAttributes, IEntityProperties } from '@diaspora/dev-typings/entity';

import { AAdapter, AAdapterEntity } from '..';
import { Type, generateUUID } from '../a-adapter/adapter-utils';

export const AutoIdAdapterEntity = <TAdapterEntity extends AAdapterEntity<TAdapterEntity>>( adapterEntity: Type<TAdapterEntity> ): Type<TAdapterEntity> =>
	class FactoredAutoIdAdapterEntity extends ( adapterEntity as any ) {
		/**
		 * This decorator allows to add the ability to the entity to generates its own ID. It should be used when the underlying store objects does not generates IDs itself, like the
		 * {@link InMemoryAdapter}.
		 *
		 * TODO review link above
		 * @author Gerkin
		 * @param attributes - Attributes of the entity
		 * @param adapter    - Adapter that will persist the entity
		 * @param propName   - Property that should contain the ID
		 * @param id         - Value of the ID
		 */

		public static setId(
			attributes: IEntityAttributes,
			adapter: AAdapter<TAdapterEntity>,
			id?: EntityUid,
			propName: string = 'id',
		): IEntityProperties {
			const defaultedId = id || get( attributes, propName, generateUUID() );
			const adapterEntityAttributes = merge( attributes, {
				id: defaultedId,
				idHash: {
					[adapter.name]: defaultedId,
				},
			} );
			return adapterEntityAttributes;
		}

		/**
		 * Calls the static equivalient {@link AutoIdAdapterEntity.setId} on the attributes of the current adapter entity.
		 *
		 * @author Gerkin
		 * @param adapter  - Adapter that will persist the entity
		 * @param propName - Property that should contain the ID
		 * @param id       - Value of the ID
		 */
		protected setId(
			adapter: AAdapter<TAdapterEntity>,
			propName: string = 'id',
			id: EntityUid = get( this, 'attributes.id', generateUUID() ),
		): this {
			this._properties = FactoredAutoIdAdapterEntity.setId(
				this.attributes,
				adapter,
				id,
				propName,
			);
			return this;
		}
	} as any;
