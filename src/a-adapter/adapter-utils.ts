import { Dictionary, flattenDeep, get, isArray, isEqual, isFunction, isInteger, isNil, isNumber, isString, isUndefined, mapKeys, mapValues, some } from 'lodash';

import { IEntityAttributes } from '@diaspora/dev-typings/entity';
import { QueryLanguage } from '@diaspora/dev-typings/queryLanguage';

import { AAdapter } from '.';

declare const window: any;
declare const global: any;

export type Type<T> = ( new ( ...args: any[] ) => T );

/**
 * Create a new unique id for this store's entity.
 *
 * @author gerkin
 * @returns Generated unique id.
 */
export const generateUUID = (): string => {
	let d = new Date().getTime();
	// Use high-precision timer if available
	const perf = ( ( typeof window !== 'undefined' ? window : global ) as {performance?: { now?: () => number}} ).performance;
	if ( perf && 'function' === typeof perf.now ) {
		d += perf.now();
	}
	const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace( /[xy]/g, c => {
// tslint:disable-next-line: no-bitwise
		const r = ( d + Math.random() * 16 ) % 16 | 0;
		d = Math.floor( d / 16 );
// tslint:disable-next-line: no-bitwise
		return ( 'x' === c ? r : ( r & 0x3 ) | 0x8 ).toString( 16 );
	} );
	return uuid;
};

// Cast a number component to a number
const getNum = ( ...params: Array<string | string[]> ) => {
	const flatten = flattenDeep( params ) as string[];
	const [fullMatch, sign, val] = flatten;
	if ( '∞' === val ) {
		if ( '-' === sign ) {
			return -Infinity;
		} else {
			return Infinity;
		}
	} else {
		return parseInt( fullMatch, 10 );
	}
};
const validations = {
	type: {
		int( key: string, val: number ) {
			if ( isString( val ) ) {
				val = parseInt( val, 10 );
			}
			if ( !isInteger( val ) && isFinite( val ) ) {
				throw new TypeError( `Expect "${key}" to be an integer` );
			}
			return val;
		},
	},
	rng( key: string, val: number, range: string ) {
		const rangeMatch = range.match(
			/^([[\]])((-)?(\d+|∞)),((-)?(\d+|∞))([[\]])$/,
		);
		if ( rangeMatch ) {
			const lower = getNum( rangeMatch.splice( 2, 3 ) );
			const upper = getNum( rangeMatch.splice( 2, 3 ) );
			const isInRangeLower = '[' === rangeMatch[1] ? val >= lower : val > lower;
			const isInRangeUpper = ']' === rangeMatch[2] ? val <= upper : val < upper;
			if ( !( isInRangeLower && isInRangeUpper ) ) {
				throw new RangeError(
					`Expect "${key}" to be within ${range}, have "${val}"`,
				);
			}
		}
		return val;
	},
};

/**
 * Check if a validation matches
 *
 * @param key - The name of the option checked
 * @param val - The value to match against
 */
const validateOption = (
	key: string,
	val: any,
	config: { type: string; rng?: string },
): any => {
	const valTypes: any = validations.type;
	if ( valTypes[config.type] ) {
		val = valTypes[config.type]( key, val );
	}
	if ( config.rng ) {
		if ( !isString( val ) && !isNumber( val ) ) {
			throw new TypeError( `A range operator to match against the option ${key} must be a string or a number, not a ${typeof val}` );
		}
		if ( isString( val ) ) {
			val = parseInt( val, 10 );
		}
		val = validations.rng( key, val, config.rng );
	}
	return val;
};

/**
 * TODO.
 *
 * @author gerkin
 * @see TODO remapping.
 */
export const remapIO = <TEntity extends IEntityAttributes>(
	adapter: AAdapter<any>,
	tableName: string,
	query: TEntity,
	input: boolean,
) => {
	const direction = input ? 'input' : 'output';
	const filtered = mapValues( query, ( value, key ) => {
		const filter = get(
			adapter,
			['filters', tableName, direction, key],
			undefined,
		);
		if ( isFunction( filter ) ) {
			return filter( value );
		}
		return value;
	} );
	const remapType = input ? 'normal' : 'inverted';
	const remaped = mapKeys( filtered, ( value, key ) => get( adapter, ['remaps', tableName, remapType, key], key ) );
	return remaped as TEntity;
};

export type IQueryCheckFunction = ( entityVal: any, targetVal: any ) => boolean;

export const OPERATORS: Dictionary<IQueryCheckFunction | undefined> = {
	$contains: ( entityVal: any, targetVal: any ) =>
		!isUndefined( entityVal ) && isArray( entityVal ) && some( entityVal, val => isEqual( val, targetVal ) ),
	$diff: ( entityVal: any, targetVal: any ) =>
		!isUndefined( entityVal ) && entityVal !== targetVal,
	$equal: ( entityVal: any, targetVal: any ) =>
		!isUndefined( entityVal ) && entityVal === targetVal,
	$exists: ( entityVal: any, targetVal: any ) =>
		targetVal === !isUndefined( entityVal ),
	$greater: ( entityVal: any, targetVal: any ) =>
		!isUndefined( entityVal ) && entityVal > targetVal,
	$greaterEqual: ( entityVal: any, targetVal: any ) =>
		!isUndefined( entityVal ) && entityVal >= targetVal,
	$less: ( entityVal: any, targetVal: any ) =>
		!isUndefined( entityVal ) && entityVal < targetVal,
	$lessEqual: ( entityVal: any, targetVal: any ) =>
		!isUndefined( entityVal ) && entityVal <= targetVal,
};
export const CANONICAL_OPERATORS: Dictionary<string> = {
	'!=': '$diff',
	'<': '$less',
	'<=': '$lessEqual',
	'==': '$equal',
	'>': '$greater',
	'>=': '$greaterEqual',
	'~': '$exists',
};

export type TQueryOptionsValidator = ( ops: QueryLanguage.IQueryOptions ) => void;
export const QUERY_OPTIONS_TRANSFORMS: Dictionary<TQueryOptionsValidator> = {
	limit( opts: QueryLanguage.IQueryOptions ) {
		opts.limit = validateOption( 'limit', opts.limit as number, {
			rng: '[0,∞]',
			type: 'int',
		} );
	},
	skip( opts: QueryLanguage.IQueryOptions ) {
		opts.skip = validateOption( 'skip', opts.skip as number, {
			rng: '[0,∞[',
			type: 'int',
		} );
	},
	page( opts: QueryLanguage.IQueryOptions ) {
		if ( !isNumber( opts.limit ) ) {
			throw new ReferenceError( 'Usage of "options.page" requires "options.limit" to be defined.' );
		}
		if ( !isFinite( opts.limit as number ) ) {
			throw new RangeError( 'Usage of "options.page" requires "options.limit" to not be infinite' );
		}
		if ( !isNil( opts.skip ) ) {
			throw new ReferenceError( 'Use either "options.page" or "options.skip"' );
		}
		opts.skip =
		validateOption( 'page', opts.page as number, {
			rng: '[0,∞[',
			type: 'int',
		} ) * ( opts.limit as number );
		delete opts.page;
	},
};
