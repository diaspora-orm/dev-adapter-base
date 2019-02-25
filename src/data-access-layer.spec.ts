/* tslint:disable max-classes-per-file */
jest.mock( './a-adapter' );
import { IEntityProperties } from '@diaspora/dev-typings';
import { times } from 'lodash';
import { AAdapter, AAdapterEntity } from './a-adapter';
import { generateUUID } from './a-adapter/adapter-utils';
import { DataAccessLayer } from './data-access-layer';
import { EntityUid } from './entity-uid';

class MockEntity extends AAdapterEntity<MockEntity> {
	public ctor = jest.fn();
	public constructor( entity: IEntityProperties, dataSource: AAdapter<MockEntity> ) {
		super( entity, dataSource );
		this.ctor( ...arguments );
	}
}
class MockAdapter extends AAdapter<MockEntity> {
	public remapInput = jest.fn( ( t, v ) => v );
	public remapOutput = jest.fn( ( t, v ) => v );
	public normalizeOptions = jest.fn( v => v );
	public normalizeQuery = jest.fn( v => v );
	public name = generateUUID();
	public insertOne = jest.fn();
	public insertMany = jest.fn();
	public findOne = jest.fn();
	public findMany = jest.fn();
	public updateOne = jest.fn();
	public updateMany = jest.fn();
	public deleteOne = jest.fn();
	public deleteMany = jest.fn();
	public contains = jest.fn();
	public count = jest.fn();
	public every = jest.fn();
	public makeEntity = jest.fn();
	public ctor = jest.fn();
	public constructor( _classEntity: new ( ...args: any[] ) => MockEntity, name: string ) {
		super( _classEntity, name );
		this.ctor( ...arguments );
	}
}

beforeEach( () => {
	jest.clearAllMocks();
} );
describe( 'Adapter props relay', () => {
	it( 'Should relay the `name` prop', () => {
		const tmpAdapter = new MockAdapter( MockEntity, 'tmp' );
		const tmpDal = DataAccessLayer.retrieveAccessLayer( tmpAdapter );
		expect( tmpDal.name ).toEqual( tmpAdapter.name );
	} );
} );
describe( 'retrieveAccessLayer', () => {
	it( 'Should call the constructor if the adapter isn\'t yet registered', () => {
		const tmpAdapter = new MockAdapter( MockEntity, 'tmp' );
		const tmpDal = DataAccessLayer.retrieveAccessLayer( tmpAdapter );

		expect( tmpDal ).toBeInstanceOf( DataAccessLayer );
		expect( ( tmpDal as any ).adapter ).toBe( tmpAdapter );
	} );
	it( 'Should not call the constructor if the adapter is already registered', () => {
		const tmpAdapter = new MockAdapter( MockEntity, 'tmp' );
		const tmpDal = DataAccessLayer.retrieveAccessLayer( tmpAdapter );
		const tmpDal2 = DataAccessLayer.retrieveAccessLayer( tmpAdapter );

		expect( tmpDal2 ).toBe( tmpDal );
	} );
} );
describe( 'Normalization', () => {
	describe( 'ensureQueryObject', () => {
		it( '`undefined` should be casted to empty object', () => {

			expect( ( DataAccessLayer as any ).ensureQueryObject( undefined ) ).toEqual( {} );
		} );
		it( 'Simple entity UID should be casted to an object with a single key: the id field', () => {
			jest.spyOn( EntityUid, 'isEntityUid' ).mockReturnValue( true );

			expect( ( DataAccessLayer as any ).ensureQueryObject( 12 ) ).toEqual( {id: 12} );
		} );
		it( 'Objects should be passed as-is', () => {
			jest.spyOn( EntityUid, 'isEntityUid' ).mockReturnValue( false );
			const query = {};

			expect( ( DataAccessLayer as any ).ensureQueryObject( query ) ).toBe( query );
		} );
	} );
	it( '`normalizeQuery` should call standard & adapter\'s normalization', () => {
		const tmpAdapter = new MockAdapter( MockEntity, 'tmp' );
		const tmpDal = DataAccessLayer.retrieveAccessLayer( tmpAdapter );
		const retVal = {};
		const mockEQO = jest.spyOn( DataAccessLayer, 'ensureQueryObject' as any ).mockReturnValue( retVal );

		const query = {};
		const opts = {};
		expect( ( tmpDal as any ).normalizeQuery( query, opts as any ) ).toEqual( query );
		expect( mockEQO ).toHaveBeenCalledTimes( 1 );
		expect( mockEQO ).toHaveBeenCalledWith( query );
		expect( tmpAdapter.normalizeQuery ).toHaveBeenCalledTimes( 1 );
		expect( tmpAdapter.normalizeQuery ).toHaveBeenCalledWith( retVal, opts );
	} );
	describe( '`normalizeInputs`', () => {
		it( '`normalizeInputs` should support only single raw object. (insertOne)', () => {
			const tmpAdapter = new MockAdapter( MockEntity, 'tmp' );
			const tmpDal = DataAccessLayer.retrieveAccessLayer( tmpAdapter );
			const inputs = {
				options: undefined,
				query: undefined,
				rawObj: {},
			};
			jest.spyOn( tmpDal, 'normalizeQuery' as any );
			const mockRawObjOut = {};
			tmpAdapter.remapInput.mockReturnValue( mockRawObjOut );

			const normalized = ( tmpDal as any ).normalizeInputs( 'table', inputs );
			expect( normalized.query ).toBe( undefined );
			expect( normalized.options ).toBe( undefined );
			expect( normalized ).toHaveProperty( 'rawObj', mockRawObjOut );
			expect( tmpAdapter.normalizeOptions ).not.toHaveBeenCalled();
			expect( ( tmpDal as any ).normalizeQuery ).not.toHaveBeenCalled();
			expect( tmpAdapter.remapInput ).toHaveBeenCalledTimes( 1 );
			expect( tmpAdapter.remapInput ).toHaveBeenCalledWith( 'table', inputs.rawObj );
		} );
		it( '`normalizeInputs` should support only array raw object. (insertMany)', () => {
			const tmpAdapter = new MockAdapter( MockEntity, 'tmp' );
			const tmpDal = DataAccessLayer.retrieveAccessLayer( tmpAdapter );
			const inputs = {
				options: undefined,
				query: undefined,
				rawObj: [{}, {}],
			};
			jest.spyOn( tmpDal, 'normalizeQuery' as any );
			const mockRawObjOut = {};
			tmpAdapter.remapInput.mockReturnValue( mockRawObjOut );

			const normalized = ( tmpDal as any ).normalizeInputs( 'table', inputs );
			expect( normalized.query ).toBe( undefined );
			expect( normalized.options ).toBe( undefined );
			expect( normalized.rawObj ).toBeInstanceOf( Array );
			expect( normalized.rawObj[0] ).toBe( mockRawObjOut );
			expect( normalized.rawObj[1] ).toBe( mockRawObjOut );
			expect( tmpAdapter.normalizeOptions ).not.toHaveBeenCalled();
			expect( ( tmpDal as any ).normalizeQuery ).not.toHaveBeenCalled();
			expect( tmpAdapter.remapInput ).toHaveBeenCalledTimes( 2 );
			expect( tmpAdapter.remapInput ).toHaveBeenNthCalledWith( 1, 'table', inputs.rawObj[0] );
			expect( tmpAdapter.remapInput ).toHaveBeenNthCalledWith( 1, 'table', inputs.rawObj[1] );
		} );
		it( '`normalizeInputs` should normalize query, options and single raw entity object (updateOne)', () => {
			const tmpAdapter = new MockAdapter( MockEntity, 'tmp' );
			const tmpDal = DataAccessLayer.retrieveAccessLayer( tmpAdapter );
			const inputs = {
				options: {},
				query: {},
				rawObj: {},
			};
			const mockQueryOut = {};
			jest.spyOn( tmpDal, 'normalizeQuery' as any ).mockReturnValue( mockQueryOut );
			// Remapped value will be the same as `mockRawObjOut`
			const mockOptionsOut = {};
			tmpAdapter.normalizeOptions.mockReturnValue( mockOptionsOut );
			const mockRawObjOut = {};
			tmpAdapter.remapInput.mockReturnValue( mockRawObjOut );

			const normalized = ( tmpDal as any ).normalizeInputs( 'table', inputs );
			expect( normalized ).toHaveProperty( 'query', mockRawObjOut );
			expect( normalized ).toHaveProperty( 'options', mockOptionsOut );
			expect( normalized ).toHaveProperty( 'rawObj', mockRawObjOut );
			expect( tmpAdapter.normalizeOptions ).toHaveBeenCalledTimes( 1 );
			expect( tmpAdapter.normalizeOptions ).toHaveBeenCalledWith( inputs.options );
			expect( ( tmpDal as any ).normalizeQuery ).toHaveBeenCalledTimes( 1 );
			expect( ( tmpDal as any ).normalizeQuery ).toHaveBeenCalledWith( inputs.query, mockOptionsOut );
			expect( tmpAdapter.remapInput ).toHaveBeenCalledTimes( 2 );
			expect( tmpAdapter.remapInput ).toHaveBeenCalledWith( 'table', inputs.rawObj );
			expect( tmpAdapter.remapInput ).toHaveBeenCalledWith( 'table', mockQueryOut );
		} );
		it( '`normalizeInputs` should normalize query, options and multiple raw entity object (updateMany)', () => {
			const tmpAdapter = new MockAdapter( MockEntity, 'tmp' );
			const tmpDal = DataAccessLayer.retrieveAccessLayer( tmpAdapter );
			const inputs = {
				options: {},
				query: {},
				rawObj: [{}, {}],
			};
			const mockQueryOut = {};
			jest.spyOn( tmpDal, 'normalizeQuery' as any ).mockReturnValue( mockQueryOut );
			// Remapped value will be the same as `mockRawObjOut`
			const mockOptionsOut = {};
			tmpAdapter.normalizeOptions.mockReturnValue( mockOptionsOut );
			const mockRawObjOut = {};
			tmpAdapter.remapInput.mockReturnValue( mockRawObjOut );

			const normalized = ( tmpDal as any ).normalizeInputs( 'table', inputs );
			expect( normalized ).toHaveProperty( 'query', mockRawObjOut );
			expect( normalized ).toHaveProperty( 'options', mockOptionsOut );
			expect( normalized.rawObj ).toBeInstanceOf( Array );
			expect( normalized.rawObj[0] ).toBe( mockRawObjOut );
			expect( normalized.rawObj[1] ).toBe( mockRawObjOut );
			expect( tmpAdapter.normalizeOptions ).toHaveBeenCalledTimes( 1 );
			expect( tmpAdapter.normalizeOptions ).toHaveBeenCalledWith( inputs.options );
			expect( ( tmpDal as any ).normalizeQuery ).toHaveBeenCalledTimes( 1 );
			expect( ( tmpDal as any ).normalizeQuery ).toHaveBeenCalledWith( inputs.query, mockOptionsOut );
			expect( tmpAdapter.remapInput ).toHaveBeenCalledTimes( 3 );
			expect( tmpAdapter.remapInput ).toHaveBeenCalledWith( 'table', inputs.rawObj[0] );
			expect( tmpAdapter.remapInput ).toHaveBeenCalledWith( 'table', inputs.rawObj[1] );
			expect( tmpAdapter.remapInput ).toHaveBeenCalledWith( 'table', mockQueryOut );
		} );
		it( '`normalizeInputs` should normalize query, options but no raw object object (find, delete)', () => {
			const tmpAdapter = new MockAdapter( MockEntity, 'tmp' );
			const tmpDal = DataAccessLayer.retrieveAccessLayer( tmpAdapter );
			const inputs = {
				options: {},
				query: {},
				rawObj: undefined,
			};
			const mockQueryOut = {};
			jest.spyOn( tmpDal, 'normalizeQuery' as any ).mockReturnValue( mockQueryOut );
			// Remapped value will be the same as `mockRawObjOut`
			const mockOptionsOut = {};
			tmpAdapter.normalizeOptions.mockReturnValue( mockOptionsOut );
			const mockQueryRemappedOut = {};
			tmpAdapter.remapInput.mockReturnValue( mockQueryRemappedOut );

			const normalized = ( tmpDal as any ).normalizeInputs( 'table', inputs );
			expect( normalized ).toHaveProperty( 'query', mockQueryRemappedOut );
			expect( normalized ).toHaveProperty( 'options', mockOptionsOut );
			expect( normalized.rawObj ).toBe( undefined );
			expect( tmpAdapter.normalizeOptions ).toHaveBeenCalledTimes( 1 );
			expect( tmpAdapter.normalizeOptions ).toHaveBeenCalledWith( inputs.options );
			expect( ( tmpDal as any ).normalizeQuery ).toHaveBeenCalledTimes( 1 );
			expect( ( tmpDal as any ).normalizeQuery ).toHaveBeenCalledWith( inputs.query, mockOptionsOut );
			expect( tmpAdapter.remapInput ).toHaveBeenCalledTimes( 1 );
			expect( tmpAdapter.remapInput ).toHaveBeenCalledWith( 'table', mockQueryOut );
		} );
	} );
} );

describe( 'Query methods', () => {
	describe( 'CRUD', () => {
		describe( 'Insert', () => {
			describe( '`insertOne`', () => {
				it( '`insertOne` should normalize inputs & output for the underlying adapter when insertion is OK.', async () => {
					const tmpAdapter = new MockAdapter( MockEntity, 'tmp' );
					const tmpDal = DataAccessLayer.retrieveAccessLayer( tmpAdapter );
					const baseObj = {};
					const baseObjRemapped = {};
					const mockedNormalizeInputs = ( jest.spyOn( tmpDal, 'normalizeInputs' as any ) as jest.Mock<any, any> )
					.mockReturnValue( {query: undefined, options: undefined, rawObj: baseObjRemapped} );
					const remappedOutObj = {};
					const insertedObj = {};
					tmpAdapter.insertOne.mockReturnValue( insertedObj );
					const factoredObj = new MockEntity( {}, tmpAdapter );
					tmpAdapter.makeEntity.mockReturnValue( factoredObj );

					expect( await tmpDal.insertOne( 'table', baseObj ) ).toBe( factoredObj );
					expect( mockedNormalizeInputs ).toHaveBeenCalledTimes( 1 );
					expect( mockedNormalizeInputs.mock.calls[0][0] ).toBe( 'table' );
					expect( mockedNormalizeInputs.mock.calls[0][1].query ).toBe( undefined );
					expect( mockedNormalizeInputs.mock.calls[0][1].options ).toBe( undefined );
					expect( mockedNormalizeInputs.mock.calls[0][1].rawObj ).toBe( baseObj );
					expect( tmpAdapter.insertOne ).toHaveBeenCalledTimes( 1 );
					expect( tmpAdapter.insertOne ).toHaveBeenCalledWith( 'table', baseObjRemapped );
					expect( tmpAdapter.remapOutput ).toHaveBeenCalledTimes( 1 );
					expect( tmpAdapter.remapOutput ).toHaveBeenCalledWith( 'table', insertedObj );
					expect( tmpAdapter.makeEntity ).toHaveBeenCalledTimes( 1 );
					expect( tmpAdapter.makeEntity ).toHaveBeenCalledWith( remappedOutObj );
				} );
				it( '`insertOne` should normalize inputs, but throw if insert is not OK.', async () => {
					const tmpAdapter = new MockAdapter( MockEntity, 'tmp' );
					const tmpDal = DataAccessLayer.retrieveAccessLayer( tmpAdapter );
					const baseObj = {};
					const baseObjRemapped = {};
					const mockedNormalizeInputs = ( jest.spyOn( tmpDal, 'normalizeInputs' as any ) as jest.Mock<any, any> )
					.mockReturnValue( {query: undefined, options: undefined, rawObj: baseObjRemapped} );
					tmpAdapter.insertOne.mockReturnValue( undefined );

					const queryPromise = tmpDal.insertOne( 'table', baseObj );
					await expect( queryPromise ).rejects.toThrowError( Error );
					await expect( queryPromise ).rejects.toThrowError( /adapter.+nil value/ );
					expect( mockedNormalizeInputs ).toHaveBeenCalledTimes( 1 );
					expect( mockedNormalizeInputs.mock.calls[0][0] ).toBe( 'table' );
					expect( mockedNormalizeInputs.mock.calls[0][1].query ).toBe( undefined );
					expect( mockedNormalizeInputs.mock.calls[0][1].options ).toBe( undefined );
					expect( mockedNormalizeInputs.mock.calls[0][1].rawObj ).toBe( baseObj );
					expect( tmpAdapter.insertOne ).toHaveBeenCalledTimes( 1 );
					expect( tmpAdapter.insertOne ).toHaveBeenCalledWith( 'table', baseObjRemapped );
					expect( tmpAdapter.remapOutput ).toHaveBeenCalledTimes( 0 );
					expect( tmpAdapter.makeEntity ).toHaveBeenCalledTimes( 0 );
				} );
			} );
			describe( '`insertMany`', () => {
				it( '`insertMany` should normalize all inputs & output for the underlying adapter when insertion is OK.', async () => {
					const tmpAdapter = new MockAdapter( MockEntity, 'tmp' );
					const tmpDal = DataAccessLayer.retrieveAccessLayer( tmpAdapter );
					const baseObj = [{}, {}];
					const baseObjRemapped = [{}, {}];
					const mockedNormalizeInputs = ( jest.spyOn( tmpDal, 'normalizeInputs' as any ) as jest.Mock<any, any> )
					.mockReturnValue( {query: undefined, options: undefined, rawObj: baseObjRemapped} );
					const insertedObj = [{}, {}];
					tmpAdapter.insertMany.mockReturnValue( insertedObj );
					const remappedOutObj = [{}, {}];
					tmpAdapter.remapOutput
					.mockReturnValueOnce( remappedOutObj[0] )
					.mockReturnValueOnce( remappedOutObj[1] );
					const factoredObj = times( 3, () => new MockEntity( {}, tmpAdapter ) );
					tmpAdapter.makeEntity
					.mockReturnValueOnce( factoredObj[0] )
					.mockReturnValueOnce( factoredObj[1] );

					const insertedFinal = await tmpDal.insertMany( 'table', baseObj );
					expect( insertedFinal ).toBeInstanceOf( Array );
					expect( insertedFinal ).toHaveLength( 2 );
					expect( insertedFinal[0] ).toBe( factoredObj[0] );
					expect( insertedFinal[1] ).toBe( factoredObj[1] );
					expect( mockedNormalizeInputs ).toHaveBeenCalledTimes( 1 );
					expect( mockedNormalizeInputs.mock.calls[0][0] ).toBe( 'table' );
					expect( mockedNormalizeInputs.mock.calls[0][1].query ).toBe( undefined );
					expect( mockedNormalizeInputs.mock.calls[0][1].options ).toBe( undefined );
					expect( mockedNormalizeInputs.mock.calls[0][1].rawObj ).toBe( baseObj );
					expect( tmpAdapter.insertMany ).toHaveBeenCalledTimes( 1 );
					expect( tmpAdapter.insertMany ).toHaveBeenCalledWith( 'table', baseObjRemapped );
					expect( tmpAdapter.remapOutput ).toHaveBeenCalledTimes( 2 );
					expect( tmpAdapter.remapOutput ).toHaveBeenNthCalledWith( 1, 'table', insertedObj[0] );
					expect( tmpAdapter.remapOutput ).toHaveBeenNthCalledWith( 2, 'table', insertedObj[1] );
					expect( tmpAdapter.makeEntity ).toHaveBeenCalledTimes( 2 );
					expect( tmpAdapter.makeEntity ).toHaveBeenNthCalledWith( 1, remappedOutObj[0] );
					expect( tmpAdapter.makeEntity ).toHaveBeenNthCalledWith( 2, remappedOutObj[1] );
				} );
				it( 'insertMany should normalize inputs, but throw if inserted entities length is not the same as params.', async () => {
					const tmpAdapter = new MockAdapter( MockEntity, 'tmp' );
					const tmpDal = DataAccessLayer.retrieveAccessLayer( tmpAdapter );
					const baseObj = [{}, {}];
					const baseObjRemapped = [{}, {}];
					const mockedNormalizeInputs = ( jest.spyOn( tmpDal, 'normalizeInputs' as any ) as jest.Mock<any, any> )
					.mockReturnValue( {query: undefined, options: undefined, rawObj: baseObjRemapped} );
					tmpAdapter.insertMany.mockReturnValue( [{}] );

					const queryPromise = tmpDal.insertMany( 'table', baseObj );
					await expect( queryPromise ).rejects.toThrowError( Error );
					await expect( queryPromise ).rejects.toThrowError( /adapter.+incorrect number/ );
					expect( mockedNormalizeInputs ).toHaveBeenCalledTimes( 1 );
					expect( mockedNormalizeInputs.mock.calls[0][0] ).toBe( 'table' );
					expect( mockedNormalizeInputs.mock.calls[0][1].query ).toBe( undefined );
					expect( mockedNormalizeInputs.mock.calls[0][1].options ).toBe( undefined );
					expect( mockedNormalizeInputs.mock.calls[0][1].rawObj ).toBe( baseObj );
					expect( tmpAdapter.insertMany ).toHaveBeenCalledTimes( 1 );
					expect( tmpAdapter.insertMany ).toHaveBeenCalledWith( 'table', baseObjRemapped );
					expect( tmpAdapter.remapOutput ).toHaveBeenCalledTimes( 0 );
					expect( tmpAdapter.makeEntity ).toHaveBeenCalledTimes( 0 );
				} );
				it( 'insertMany should normalize inputs, but throw if any insert is not OK', async () => {
					const tmpAdapter = new MockAdapter( MockEntity, 'tmp' );
					const tmpDal = DataAccessLayer.retrieveAccessLayer( tmpAdapter );
					const baseObj = [{}, {}];
					const baseObjRemapped = [{}, {}];
					const mockedNormalizeInputs = ( jest.spyOn( tmpDal, 'normalizeInputs' as any ) as jest.Mock<any, any> )
					.mockReturnValue( {query: undefined, options: undefined, rawObj: baseObjRemapped} );
					tmpAdapter.insertMany.mockReturnValue( [{}, undefined] );

					const queryPromise = tmpDal.insertMany( 'table', baseObj );
					await expect( queryPromise ).rejects.toThrowError( Error );
					await expect( queryPromise ).rejects.toThrowError( /adapter.+nil value/ );
					expect( mockedNormalizeInputs ).toHaveBeenCalledTimes( 1 );
					expect( mockedNormalizeInputs.mock.calls[0][0] ).toBe( 'table' );
					expect( mockedNormalizeInputs.mock.calls[0][1].query ).toBe( undefined );
					expect( mockedNormalizeInputs.mock.calls[0][1].options ).toBe( undefined );
					expect( mockedNormalizeInputs.mock.calls[0][1].rawObj ).toBe( baseObj );
					expect( tmpAdapter.insertMany ).toHaveBeenCalledTimes( 1 );
					expect( tmpAdapter.insertMany ).toHaveBeenCalledWith( 'table', baseObjRemapped );
					expect( tmpAdapter.remapOutput ).toHaveBeenCalledTimes( 0 );
					expect( tmpAdapter.makeEntity ).toHaveBeenCalledTimes( 0 );
				} );
			} );
		} );
		describe( 'Find', () => {
			describe( '`findOne`', () => {
				it( '`findOne`should normalize inputs & output for the underlying adapter when item is found.', async () => {
					const tmpAdapter = new MockAdapter( MockEntity, 'tmp' );
					const tmpDal = DataAccessLayer.retrieveAccessLayer( tmpAdapter );
					const baseQuery = {};
					const baseOpts = {};
					const normalizedOpts = {};
					const remappedInQuery = {};
					const mockedNormalizeInputs = ( jest.spyOn( tmpDal, 'normalizeInputs' as any ) as jest.Mock<any, any> )
					.mockReturnValue( {query: remappedInQuery, options: normalizedOpts, rawObj: undefined} );
					const foundObj = {};
					tmpAdapter.findOne.mockReturnValue( foundObj );
					const remappedOutObj = {};
					tmpAdapter.remapOutput.mockReturnValue( remappedOutObj );
					const factoredObj = new MockEntity( {}, tmpAdapter );
					tmpAdapter.makeEntity.mockReturnValue( factoredObj );

					expect( await tmpDal.findOne( 'table', baseQuery, baseOpts ) ).toBe( factoredObj );
					expect( mockedNormalizeInputs.mock.calls[0][0] ).toBe( 'table' );
					expect( mockedNormalizeInputs.mock.calls[0][1].query ).toBe( baseQuery );
					expect( mockedNormalizeInputs.mock.calls[0][1].options ).toBe( baseOpts );
					expect( mockedNormalizeInputs.mock.calls[0][1].rawObj ).toBe( undefined );
					expect( tmpAdapter.findOne ).toHaveBeenCalledTimes( 1 );
					expect( tmpAdapter.findOne ).toHaveBeenCalledWith( 'table', remappedInQuery, normalizedOpts );
					expect( tmpAdapter.remapOutput ).toHaveBeenCalledTimes( 1 );
					expect( tmpAdapter.remapOutput ).toHaveBeenCalledWith( 'table', foundObj );
					expect( tmpAdapter.makeEntity ).toHaveBeenCalledTimes( 1 );
					expect( tmpAdapter.makeEntity ).toHaveBeenCalledWith( remappedOutObj );
				} );
				it( '`findOne`should normalize inputs for the underlying adapter when item is not found.', async () => {
					const tmpAdapter = new MockAdapter( MockEntity, 'tmp' );
					const tmpDal = DataAccessLayer.retrieveAccessLayer( tmpAdapter );
					const baseQuery = {};
					const baseOpts = {};
					const normalizedOpts = {};
					const remappedInQuery = {};
					const mockedNormalizeInputs = ( jest.spyOn( tmpDal, 'normalizeInputs' as any ) as jest.Mock<any, any> )
					.mockReturnValue( {query: remappedInQuery, options: normalizedOpts, rawObj: undefined} );
					tmpAdapter.findOne.mockReturnValue( undefined );
					const remappedOutObj = {};
					tmpAdapter.remapOutput.mockReturnValue( remappedOutObj );
					const factoredObj = new MockEntity( {}, tmpAdapter );
					tmpAdapter.makeEntity.mockReturnValue( factoredObj );

					expect( await tmpDal.findOne( 'table', baseQuery, baseOpts ) ).toBe( undefined );
					expect( mockedNormalizeInputs.mock.calls[0][0] ).toBe( 'table' );
					expect( mockedNormalizeInputs.mock.calls[0][1].query ).toBe( baseQuery );
					expect( mockedNormalizeInputs.mock.calls[0][1].options ).toBe( baseOpts );
					expect( mockedNormalizeInputs.mock.calls[0][1].rawObj ).toBe( undefined );
					expect( tmpAdapter.findOne ).toHaveBeenCalledTimes( 1 );
					expect( tmpAdapter.findOne ).toHaveBeenCalledWith( 'table', remappedInQuery, normalizedOpts );
					expect( tmpAdapter.remapOutput ).toHaveBeenCalledTimes( 0 );
					expect( tmpAdapter.makeEntity ).toHaveBeenCalledTimes( 0 );
				} );
			} );
			it( '`findMany` should normalize inputs & map outputs', async () => {
				const tmpAdapter = new MockAdapter( MockEntity, 'tmp' );
				const tmpDal = DataAccessLayer.retrieveAccessLayer( tmpAdapter );
				const baseQuery = {};
				const baseOpts = {};
				const normalizedOpts = {};
				const remappedInQuery = {};
				const mockedNormalizeInputs = ( jest.spyOn( tmpDal, 'normalizeInputs' as any ) as jest.Mock<any, any> )
				.mockReturnValue( {query: remappedInQuery, options: normalizedOpts, rawObj: undefined} );
				const foundObj = [{}, {}];
				tmpAdapter.findMany.mockReturnValue( foundObj );
				const remappedOutObj = [{}, {}];
				tmpAdapter.remapOutput
				.mockReturnValueOnce( remappedOutObj[0] )
				.mockReturnValueOnce( remappedOutObj[1] );
				const factoredObj = [new MockEntity( {}, tmpAdapter ), new MockEntity( {}, tmpAdapter )];
				tmpAdapter.makeEntity
				.mockReturnValueOnce( factoredObj[0] )
				.mockReturnValueOnce( factoredObj[1] );

				const foundItems = await tmpDal.findMany( 'table', baseQuery, baseOpts );
				expect( foundItems[0] ).toBe( factoredObj[0] );
				expect( foundItems[1] ).toBe( factoredObj[1] );
				expect( mockedNormalizeInputs.mock.calls[0][0] ).toBe( 'table' );
				expect( mockedNormalizeInputs.mock.calls[0][1].query ).toBe( baseQuery );
				expect( mockedNormalizeInputs.mock.calls[0][1].options ).toBe( baseOpts );
				expect( mockedNormalizeInputs.mock.calls[0][1].rawObj ).toBe( undefined );
				expect( tmpAdapter.findMany ).toHaveBeenCalledTimes( 1 );
				expect( tmpAdapter.findMany ).toHaveBeenCalledWith( 'table', remappedInQuery, normalizedOpts );
				expect( tmpAdapter.remapOutput ).toHaveBeenCalledTimes( 2 );
				expect( tmpAdapter.remapOutput ).toHaveBeenNthCalledWith( 1, 'table', foundObj[0] );
				expect( tmpAdapter.remapOutput ).toHaveBeenNthCalledWith( 2, 'table', foundObj[1] );
				expect( tmpAdapter.makeEntity ).toHaveBeenCalledTimes( 2 );
				expect( tmpAdapter.makeEntity ).toHaveBeenNthCalledWith( 1, remappedOutObj[0] );
				expect( tmpAdapter.makeEntity ).toHaveBeenNthCalledWith( 2, remappedOutObj[1] );
			} );
		} );
		describe( 'Update', () => {
			describe( '`updateOne`', () => {
				it( '`updateOne`should normalize inputs & output for the underlying adapter when item is found.', async () => {
					const tmpAdapter = new MockAdapter( MockEntity, 'tmp' );
					const tmpDal = DataAccessLayer.retrieveAccessLayer( tmpAdapter );
					const baseQuery = {};
					const baseOpts = {};
					const baseUpdate = {};
					const normalizedOpts = {};
					const remappedInQuery = {};
					const remappedUpdate = {};
					const mockedNormalizeInputs = ( jest.spyOn( tmpDal, 'normalizeInputs' as any ) as jest.Mock<any, any> )
					.mockReturnValue( {query: remappedInQuery, options: normalizedOpts, rawObj: remappedUpdate} );
					const foundObj = {};
					tmpAdapter.updateOne.mockReturnValue( foundObj );
					const remappedOutObj = {};
					tmpAdapter.remapOutput.mockReturnValue( remappedOutObj );
					const factoredObj = new MockEntity( {}, tmpAdapter );
					tmpAdapter.makeEntity.mockReturnValue( factoredObj );

					expect( await tmpDal.updateOne( 'table', baseQuery, baseUpdate, baseOpts ) ).toBe( factoredObj );
					expect( mockedNormalizeInputs.mock.calls[0][0] ).toBe( 'table' );
					expect( mockedNormalizeInputs.mock.calls[0][1].query ).toBe( baseQuery );
					expect( mockedNormalizeInputs.mock.calls[0][1].options ).toBe( baseOpts );
					expect( mockedNormalizeInputs.mock.calls[0][1].rawObj ).toBe( baseUpdate );
					expect( tmpAdapter.updateOne ).toHaveBeenCalledTimes( 1 );
					expect( tmpAdapter.updateOne ).toHaveBeenCalledWith( 'table', remappedInQuery, remappedUpdate, normalizedOpts );
					expect( tmpAdapter.remapOutput ).toHaveBeenCalledTimes( 1 );
					expect( tmpAdapter.remapOutput ).toHaveBeenCalledWith( 'table', foundObj );
					expect( tmpAdapter.makeEntity ).toHaveBeenCalledTimes( 1 );
					expect( tmpAdapter.makeEntity ).toHaveBeenCalledWith( remappedOutObj );
				} );
				it( '`updateOne`should normalize inputs for the underlying adapter when item is not found.', async () => {
					const tmpAdapter = new MockAdapter( MockEntity, 'tmp' );
					const tmpDal = DataAccessLayer.retrieveAccessLayer( tmpAdapter );
					const baseQuery = {};
					const baseOpts = {};
					const baseUpdate = {};
					const normalizedOpts = {};
					const normalizedQuery = {};
					const remappedUpdate = {};
					const mockedNormalizeInputs = ( jest.spyOn( tmpDal, 'normalizeInputs' as any ) as jest.Mock<any, any> )
					.mockReturnValue( {query: normalizedQuery, options: normalizedOpts, rawObj: remappedUpdate} );
					tmpAdapter.updateOne.mockReturnValue( undefined );
					const remappedOutObj = {};
					tmpAdapter.remapOutput.mockReturnValue( remappedOutObj );
					const factoredObj = new MockEntity( {}, tmpAdapter );
					tmpAdapter.makeEntity.mockReturnValue( factoredObj );

					expect( await tmpDal.updateOne( 'table', baseQuery, baseUpdate, baseOpts ) ).toBe( undefined );
					expect( mockedNormalizeInputs.mock.calls[0][0] ).toBe( 'table' );
					expect( mockedNormalizeInputs.mock.calls[0][1].query ).toBe( baseQuery );
					expect( mockedNormalizeInputs.mock.calls[0][1].options ).toBe( baseOpts );
					expect( mockedNormalizeInputs.mock.calls[0][1].rawObj ).toBe( baseUpdate );
					expect( tmpAdapter.updateOne ).toHaveBeenCalledTimes( 1 );
					expect( tmpAdapter.updateOne ).toHaveBeenCalledWith( 'table', normalizedQuery, remappedUpdate, normalizedOpts );
					expect( tmpAdapter.remapOutput ).toHaveBeenCalledTimes( 0 );
					expect( tmpAdapter.makeEntity ).toHaveBeenCalledTimes( 0 );
				} );
			} );
			it( '`updateMany` should normalize inputs & map outputs', async () => {
				const tmpAdapter = new MockAdapter( MockEntity, 'tmp' );
				const tmpDal = DataAccessLayer.retrieveAccessLayer( tmpAdapter );
				const baseQuery = {};
				const baseUpdate = {};
				const baseOpts = {};
				const normalizedOpts = {};
				const normalizedUpdate = {};
				const normalizedQuery = {};
				const mockedNormalizeInputs = ( jest.spyOn( tmpDal, 'normalizeInputs' as any ) as jest.Mock<any, any> )
				.mockReturnValue( {query: normalizedQuery, options: normalizedOpts, rawObj: normalizedUpdate} );
				const updatedObj = [{}, {}];
				tmpAdapter.updateMany.mockReturnValue( updatedObj );
				const remappedOutObj = [{}, {}];
				tmpAdapter.remapOutput
				.mockReturnValueOnce( remappedOutObj[0] )
				.mockReturnValueOnce( remappedOutObj[1] );
				const factoredObj = [new MockEntity( {}, tmpAdapter ), new MockEntity( {}, tmpAdapter )];
				tmpAdapter.makeEntity
				.mockReturnValueOnce( factoredObj[0] )
				.mockReturnValueOnce( factoredObj[1] );

				const updatedItems = await tmpDal.updateMany( 'table', baseQuery, baseUpdate, baseOpts );
				expect( updatedItems[0] ).toBe( factoredObj[0] );
				expect( updatedItems[1] ).toBe( factoredObj[1] );
				expect( mockedNormalizeInputs.mock.calls[0][0] ).toBe( 'table' );
				expect( mockedNormalizeInputs.mock.calls[0][1].query ).toBe( baseQuery );
				expect( mockedNormalizeInputs.mock.calls[0][1].options ).toBe( baseOpts );
				expect( mockedNormalizeInputs.mock.calls[0][1].rawObj ).toBe( baseUpdate );
				expect( tmpAdapter.updateMany ).toHaveBeenCalledTimes( 1 );
				expect( tmpAdapter.updateMany ).toHaveBeenCalledWith( 'table', normalizedQuery, normalizedUpdate, normalizedOpts );
				expect( tmpAdapter.remapOutput ).toHaveBeenCalledTimes( 2 );
				expect( tmpAdapter.remapOutput ).toHaveBeenNthCalledWith( 1, 'table', updatedObj[0] );
				expect( tmpAdapter.remapOutput ).toHaveBeenNthCalledWith( 2, 'table', updatedObj[1] );
				expect( tmpAdapter.makeEntity ).toHaveBeenCalledTimes( 2 );
				expect( tmpAdapter.makeEntity ).toHaveBeenNthCalledWith( 1, remappedOutObj[0] );
				expect( tmpAdapter.makeEntity ).toHaveBeenNthCalledWith( 2, remappedOutObj[1] );
			} );
		} );
		describe( 'Delete', () => {
			it( '`deleteOne`should normalize inputs for the underlying adapter.', async () => {
				const tmpAdapter = new MockAdapter( MockEntity, 'tmp' );
				const tmpDal = DataAccessLayer.retrieveAccessLayer( tmpAdapter );
				const baseQuery = {};
				const baseOpts = {};
				const normalizedOpts = {};
				const remappedInQuery = {};
				const mockedNormalizeInputs = ( jest.spyOn( tmpDal, 'normalizeInputs' as any ) as jest.Mock<any, any> )
				.mockReturnValue( {query: remappedInQuery, options: normalizedOpts, rawObj: undefined} );
				tmpAdapter.deleteOne.mockReturnValue( undefined );

				expect( await tmpDal.deleteOne( 'table', baseQuery, baseOpts ) ).toBe( undefined );
				expect( mockedNormalizeInputs.mock.calls[0][0] ).toBe( 'table' );
				expect( mockedNormalizeInputs.mock.calls[0][1].query ).toBe( baseQuery );
				expect( mockedNormalizeInputs.mock.calls[0][1].options ).toBe( baseOpts );
				expect( mockedNormalizeInputs.mock.calls[0][1].rawObj ).toBe( undefined );
				expect( tmpAdapter.deleteOne ).toHaveBeenCalledTimes( 1 );
				expect( tmpAdapter.deleteOne ).toHaveBeenCalledWith( 'table', remappedInQuery, normalizedOpts );
			} );
			it( '`deleteMany` should normalize inputs', async () => {
				const tmpAdapter = new MockAdapter( MockEntity, 'tmp' );
				const tmpDal = DataAccessLayer.retrieveAccessLayer( tmpAdapter );
				const baseQuery = {};
				const baseOpts = {};
				const normalizedOpts = {};
				const remappedInQuery = {};
				const mockedNormalizeInputs = ( jest.spyOn( tmpDal, 'normalizeInputs' as any ) as jest.Mock<any, any> )
				.mockReturnValue( {query: remappedInQuery, options: normalizedOpts, rawObj: undefined} );
				tmpAdapter.deleteMany.mockReturnValue( undefined );

				expect( await tmpDal.deleteMany( 'table', baseQuery, baseOpts ) ).toBe( undefined );
				expect( mockedNormalizeInputs.mock.calls[0][0] ).toBe( 'table' );
				expect( mockedNormalizeInputs.mock.calls[0][1].query ).toBe( baseQuery );
				expect( mockedNormalizeInputs.mock.calls[0][1].options ).toBe( baseOpts );
				expect( mockedNormalizeInputs.mock.calls[0][1].rawObj ).toBe( undefined );
				expect( tmpAdapter.deleteMany ).toHaveBeenCalledTimes( 1 );
				expect( tmpAdapter.deleteMany ).toHaveBeenCalledWith( 'table', remappedInQuery, normalizedOpts );
			} );
		} );
	} );
	describe( 'Utility', () => {
		it( '`contains` should normalize inputs', async () => {
			const tmpAdapter = new MockAdapter( MockEntity, 'tmp' );
			const tmpDal = DataAccessLayer.retrieveAccessLayer( tmpAdapter );
			const baseQuery = {};
			const baseOpts = {};
			const normalizedOpts = {};
			const remappedInQuery = {};
			const mockedNormalizeInputs = ( jest.spyOn( tmpDal, 'normalizeInputs' as any ) as jest.Mock<any, any> )
			.mockReturnValue( {query: remappedInQuery, options: normalizedOpts, rawObj: undefined} );
			tmpAdapter.contains.mockReturnValue( true );

			expect( await tmpDal.contains( 'table', baseQuery, baseOpts ) ).toBe( true );
			expect( mockedNormalizeInputs.mock.calls[0][0] ).toBe( 'table' );
			expect( mockedNormalizeInputs.mock.calls[0][1].query ).toBe( baseQuery );
			expect( mockedNormalizeInputs.mock.calls[0][1].options ).toBe( baseOpts );
			expect( mockedNormalizeInputs.mock.calls[0][1].rawObj ).toBe( undefined );
			expect( tmpAdapter.contains ).toHaveBeenCalledTimes( 1 );
			expect( tmpAdapter.contains ).toHaveBeenCalledWith( 'table', remappedInQuery, normalizedOpts );
		} );
		it( '`count` should normalize inputs', async () => {
			const tmpAdapter = new MockAdapter( MockEntity, 'tmp' );
			const tmpDal = DataAccessLayer.retrieveAccessLayer( tmpAdapter );
			const baseQuery = {};
			const baseOpts = {};
			const normalizedOpts = {};
			const remappedInQuery = {};
			const mockedNormalizeInputs = ( jest.spyOn( tmpDal, 'normalizeInputs' as any ) as jest.Mock<any, any> )
			.mockReturnValue( {query: remappedInQuery, options: normalizedOpts, rawObj: undefined} );
			tmpAdapter.count.mockReturnValue( 3 );

			expect( await tmpDal.count( 'table', baseQuery, baseOpts ) ).toBe( 3 );
			expect( mockedNormalizeInputs.mock.calls[0][0] ).toBe( 'table' );
			expect( mockedNormalizeInputs.mock.calls[0][1].query ).toBe( baseQuery );
			expect( mockedNormalizeInputs.mock.calls[0][1].options ).toBe( baseOpts );
			expect( mockedNormalizeInputs.mock.calls[0][1].rawObj ).toBe( undefined );
			expect( tmpAdapter.count ).toHaveBeenCalledTimes( 1 );
			expect( tmpAdapter.count ).toHaveBeenCalledWith( 'table', remappedInQuery, normalizedOpts );
		} );
		it( '`every` should normalize inputs', async () => {
			const tmpAdapter = new MockAdapter( MockEntity, 'tmp' );
			const tmpDal = DataAccessLayer.retrieveAccessLayer( tmpAdapter );
			const baseQuery = {};
			const baseOpts = {};
			const normalizedOpts = {};
			const remappedInQuery = {};
			const mockedNormalizeInputs = ( jest.spyOn( tmpDal, 'normalizeInputs' as any ) as jest.Mock<any, any> )
			.mockReturnValue( {query: remappedInQuery, options: normalizedOpts, rawObj: undefined} );
			tmpAdapter.every.mockReturnValue( false );

			expect( await tmpDal.every( 'table', baseQuery, baseOpts ) ).toBe( false );
			expect( mockedNormalizeInputs.mock.calls[0][0] ).toBe( 'table' );
			expect( mockedNormalizeInputs.mock.calls[0][1].query ).toBe( baseQuery );
			expect( mockedNormalizeInputs.mock.calls[0][1].options ).toBe( baseOpts );
			expect( mockedNormalizeInputs.mock.calls[0][1].rawObj ).toBe( undefined );
			expect( tmpAdapter.every ).toHaveBeenCalledTimes( 1 );
			expect( tmpAdapter.every ).toHaveBeenCalledWith( 'table', remappedInQuery, normalizedOpts );
		} );
	} );
} );
describe( 'Various', () => {
	it( '`waitReady` should call the adapter method', () => {
		const tmpAdapter = new MockAdapter( MockEntity, 'tmp' );
		const tmpDal = DataAccessLayer.retrieveAccessLayer( tmpAdapter );
// tslint:disable-next-line: no-floating-promises
		expect( tmpDal.waitReady() ).toBeInstanceOf( Promise );
		expect( tmpAdapter.waitReady ).toHaveBeenCalledTimes( 1 );
	} );
	it( '`configureCollection` should call the adapter method', () => {
		const tmpAdapter = new MockAdapter( MockEntity, 'tmp' );
		const tmpDal = DataAccessLayer.retrieveAccessLayer( tmpAdapter );
		const remapsIn = {};
		const remapsOut = {};
		expect( tmpDal.configureCollection( 'foo', remapsIn, remapsOut ) ).toBe( tmpDal );
		expect( tmpAdapter.configureCollection ).toHaveBeenCalledTimes( 1 );
		expect( tmpAdapter.configureCollection ).toHaveBeenCalledWith( 'foo', remapsIn, remapsOut );
	} );
} );
