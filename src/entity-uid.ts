import { isNumber, isString } from 'lodash';

/**
 * TODO: Replace with a decorator to register type validation.
 * For instance, mongo may use the new decorator to declare a checking class that may recognize a class instance as an entity uid.
 * It would allow the mongo adapter to use normal mongo uuid as EntityUid type member
 *
 * @author Gerkin
 */
export class EntityUid {
	/**
	 * Use `isEntityUid` to check if the value can be a valid entity uid
	 *
	 * @returns True if it is a valid entity Uid, false otherwise.
	 * @author Gerkin
	 * @see http://www.ecma-international.org/ecma-262/6.0/#sec-function.prototype-@@hasinstance `Symbol.hasInstance` should defined with `Object.defineProperty`
	 */
	public static isEntityUid( query: any ): query is EntityUid {
		return ( isString( query ) && query !== '' ) ||
			( isNumber( query ) && query !== 0 );
	}
}
