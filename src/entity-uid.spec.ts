import { EntityUid } from './entity-uid';

it.each( ['abc', '1234567890abcdefg', 1, 123456] )( 'Valid entity uid "%s" should pass.', v => {
	expect( EntityUid.isEntityUid( v ) ).toBe( true );
} );
it.each( [null, undefined, {}, {foo: 'bar'}, [], [123], true, false, new Date()] )( 'Invalid entity uid "%s" should NOT pass.', v => {
	expect( EntityUid.isEntityUid( v ) ).toBe( false );
} );
