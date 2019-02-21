import { every, isObject, toPairs } from 'lodash';

import { IEntityProperties } from '@diaspora/dev-typings/entity';
import { _QueryLanguage } from '@diaspora/dev-typings/queryLanguage';

import { AAdapterEntity } from '..';
import { OPERATORS, Type } from '../a-adapter/adapter-utils';

export const SelfMatchingAdapterEntity = <TAdapterEntity extends AAdapterEntity<TAdapterEntity>>( adapterEntity: Type<TAdapterEntity> ): Type<TAdapterEntity> =>
	class FactoredSelfMatchingAdapterEntity extends ( adapterEntity as any ) {
		/**
		 * Check if provided `entity` is matched by the query. Query must be in its canonical form before using this function.
		 *
		 * @author gerkin
		 */
		public static matches(
			attributes: IEntityProperties,
			query: _QueryLanguage.ISelectQuery,
		): boolean {
			// Iterate over every query keys to check each predicates
			const matchResult = every( toPairs( query ), ( [key, desc] ) => {
				if ( isObject( desc ) ) {
					const entityVal = attributes[key];
					// Iterate over each matchers in the query for this attribute
					return every( desc, ( val, operationName ) => {
						// Try to execute the rule's matcher if any
						const operationFunction = OPERATORS[operationName];
						if ( operationFunction ) {
							return operationFunction( entityVal, val );
						} else {
							return false;
						}
					} );
				}
				return false;
			} );
			return matchResult;
		}

		/**
		 * Check if provided `entity` is matched by the query. Query must be in its canonical form before using this function.
		 *
		 * @author gerkin
		 */
		public matches( query: _QueryLanguage.ISelectQuery ): boolean {
			return FactoredSelfMatchingAdapterEntity.matches( this._properties, query );
		}
	} as any;
