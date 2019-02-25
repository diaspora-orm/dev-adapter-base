import { IEntityAttributes } from '@diaspora/dev-typings/entity';
import { _QueryLanguage, QueryLanguage } from '@diaspora/dev-typings/queryLanguage';

export interface ICActionSingle {
	query?: undefined;
	options?: undefined;
	rawObj: IEntityAttributes;
}
export interface ICActionArray {
	query?: undefined;
	options?: undefined;
	rawObj: IEntityAttributes[];
}
export interface IRUDActionInSingle {
	query: QueryLanguage.SearchQuery;
	options: QueryLanguage.IQueryOptions;
	rawObj?: IEntityAttributes;
}
export interface IRUDActionInArray {
	query: QueryLanguage.SearchQuery;
	options: QueryLanguage.IQueryOptions;
	rawObj?: IEntityAttributes[];
}
export interface IRUDActionOutSingle {
	query: _QueryLanguage.SelectQueryOrCondition;
	options: _QueryLanguage.IQueryOptions;
	rawObj?: IEntityAttributes;
}
export interface IRUDActionOutArray {
	query: _QueryLanguage.SelectQueryOrCondition;
	options: _QueryLanguage.IQueryOptions;
	rawObj?: IEntityAttributes[];
}
