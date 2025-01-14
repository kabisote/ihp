import { DataSyncController, DataSubscription } from './ihp-datasync.js';

function fetchAuthenticated(path, params) {
    const jwt = localStorage.getItem('ihp_jwt');
    if (jwt !== null) {
        params.headers['Authorization'] = 'Bearer ' + jwt;
    } else {
        params.credentials = 'include';
    }

    return fetch(ihpBackendUrl(path), params);
}

function ihpBackendUrl(path) {
    const host = DataSyncController.ihpBackendHost || '';
    return host + path;
}

function infixMany(op, args) {
    const [left, right, ...rest] = typeof args[0].length === 'number' ? args[0] : Array.from(args)
    const lr = {
	tag: 'InfixOperatorExpression',
	left,
	op,
	right,
    }

    if (rest.length === 0) {
	return lr
    }

    return infixMany.call(this, op, [lr, ...rest])
}

function and() {
    return infixMany('OpAnd', arguments)
}

function or() {
    return infixMany('OpOr', arguments)
}

function infixColumnLiteral(field, op, value) {
    return {
	tag: 'InfixOperatorExpression',
	left: {
	    tag: 'ColumnExpression',
	    field,
	},
	op,
	right: {
	    tag: 'LiteralExpression',
	    value: jsValueToDynamicValue(value),
	},
    }
}

function eq(field, value) {
    return infixColumnLiteral(field, 'OpEqual', value)
}

function notEq(field, value) {
    return infixColumnLiteral(field, 'OpNotEqual', value)
}

function lessThan(field, value) {
    return infixColumnLiteral(field, 'OpLessThan', value)
}

function lessThanOrEqual(field, value) {
    return infixColumnLiteral(field, 'OpLessThanOrEqual', value)
}

function greaterThan(field, value) {
    return infixColumnLiteral(field, 'OpGreaterThan', value)
}

function greaterThanOrEqual(field, value) {
    return infixColumnLiteral(field, 'OpGreaterThanOrEqual', value)
}

function where() {
    return ConditionBuilder.prototype.where.apply(new ConditionBuilder(), Array.from(arguments))
}

function whereNot() {
    return ConditionBuilder.prototype.whereNot.apply(new ConditionBuilder(), Array.from(arguments))
}

function whereLessThan() {
    return ConditionBuilder.prototype.whereLessThan.apply(new ConditionBuilder(), Array.from(arguments))
}

function whereLessThanOrEqual() {
    return ConditionBuilder.prototype.whereLessThanOrEqual.apply(new ConditionBuilder(), Array.from(arguments))
}

function whereGreaterThan() {
    return ConditionBuilder.prototype.whereGreaterThan.apply(new ConditionBuilder(), Array.from(arguments))
}

function whereGreaterThanOrEqual() {
    return ConditionBuilder.prototype.whereGreaterThanOrEqual.apply(new ConditionBuilder(), Array.from(arguments))
}

function filterWhere() {
    return where.apply(this, Array.from(arguments))
}

function filterWhereNot() {
    return whereNot.apply(this, Array.from(arguments))
}

function filterWhereLessThan() {
    return whereLessThan.apply(this, Array.from(arguments))
}

function filterWhereLessThanOrEqual() {
    return whereLessThanOrEqual.apply(this, Array.from(arguments))
}

function filterWhereGreaterThan() {
    return whereGreaterThan.apply(this, Array.from(arguments))
}

function filterWhereGreaterThanOrEqual() {
    return whereGreaterThanOrEqual.apply(this, Array.from(arguments))
}

class ConditionBuilder {
    constructor() {
	this.conditions = null;
	this.type = 'ConditionBuilder';
    }

    #addCondition(operator, conditionExpression) {
	if (this.conditions === null) {
	    this.conditions = conditionExpression;
	} else {
	    this.conditions = {
		tag: 'InfixOperatorExpression',
		left: this.conditions,
		op: operator,
		right: conditionExpression,
	    };
	}
    }

    where(field, value) {
	const left = { tag: 'ColumnExpression', field };
	const op = 'OpEqual';
	const right = { tag: 'LiteralExpression', value: jsValueToDynamicValue(value) }
	const conditionExpression = { tag: 'InfixOperatorExpression', left, op, right }
	this.#addCondition('OpAnd', conditionExpression)

	return this
    }

    whereNot(field, value) {
	const left = { tag: 'ColumnExpression', field }
	const op = 'OpNotEqual'
	const right = { tag: 'LiteralExpression', value: jsValueToDynamicValue(value) }
	const conditionExpression = { tag: 'InfixOperatorExpression', left, op, right }
	this.#addCondition('OpAnd', conditionExpression)

	return this
    }

    whereLessThan(field, value) {
	const conditionExpression = infixColumnLiteral(field, 'OpLessThan', value)
	this.#addCondition('OpAnd', conditionExpression)
	return this
    }

    whereLessThanOrEqual(field, value) {
	const conditionExpression = infixColumnLiteral(field, 'OpLessThanOrEqual', value)
	this.#addCondition('OpAnd', conditionExpression)
	return this
    }

    whereGreaterThan(field, value) {
	const conditionExpression = infixColumnLiteral(field, 'OpGreaterThan', value)
	this.#addCondition('OpAnd', conditionExpression)
	return this
    }

    whereGreaterThanOrEqual(field, value) {
	const conditionExpression = infixColumnLiteral(field, 'OpGreaterThanOrEqual', value)
	this.#addCondition('OpAnd', conditionExpression)
	return this
    }

    filterWhere() {
	return this.where.apply(this, Array.from(arguments))
    }

    filterWhereNot() {
	return this.whereNot.apply(this, Array.from(arguments))
    }

    filterWhereLessThan() {
	return this.whereLessThan.apply(this, Array.from(arguments))
    }

    filterWhereLessThanOrEqual() {
	return this.whereLessThanOrEqual.apply(this, Array.from(arguments))
    }

    filterWhereGreaterThan() {
	return this.whereGreaterThan.apply(this, Array.from(arguments))
    }

    filterWhereGreaterThanOrEqual() {
	return this.whereGreaterThanOrEqual.apply(this, Array.from(arguments))
    }

    or(conditionBuilder) {
	if (this.conditions === null) {
	    throw new Error('You are attempting to add a condition using `or`, but there are no previous conditions to apply the `or` to. You probably want `where` instead.')
	}
	const conditionExpression = conditionBuilder.build();
	this.#addCondition('OpOr', conditionExpression)
	return this
    }

    and(conditionBuilder) {
	if (this.conditions === null) {
	    throw new Error('You are attempting to add a condition using `and`, but there are no previous conditions to apply the `and` to. You probably want `where` instead.')
	}
	const conditionExpression = conditionBuilder.build();
	this.#addCondition('OpAnd', conditionExpression)
	return this
    }

    build() {
	if (this.conditions === null) {
	    return { tag: 'LiteralExpression', value: jsValueToDynamicValue(true) }
	}
	return this.conditions;
    }
}

class QueryBuilder {
    constructor(table) {
        // Maps to 'DynamicSQLQuery'
        this.query = {
            table,
            selectedColumns: { tag: 'SelectAll' },
            whereCondition: null,
            orderByClause: [],
            limit: null,
            offset: null
        };
        this.transactionId = null;
    }

    #addWhereCondition(operator, conditionExpression) {
	if (this.query.whereCondition === null) {
	    this.query.whereCondition = conditionExpression;
	} else {
	    this.query.whereCondition = {
		tag: 'InfixOperatorExpression',
		left: this.query.whereCondition,
		op: operator,
		right: conditionExpression,
	    };
	}
    }

    where() {
	if (typeof arguments[0] === 'string') {
	    // this is a shorthand case: where(field, value)
	    const [field, value] = arguments;
	    return this.where(eq(field, value))
	} else if (typeof arguments[0] === 'object') {
	    if (arguments[0].type === 'ConditionBuilder') {
		// this is the full case: where(<ConditionBuilder>)
		const [conditionBuilder] = arguments;
		this.#addWhereCondition('OpAnd', conditionBuilder.build())
	    } else if (typeof arguments[0].tag === 'string') {
		this.#addWhereCondition('OpAnd', arguments[0])
	    } else {
		// received a key-value object with conditions
		this.where(and(Object.entries(arguments[0]).map(([k, v]) => eq(k, v))))
	    }
	}

        return this;
    }

    whereNot(field, value) {
	const conditionExpression = infixColumnLiteral(field, 'OpNotEqual', value)
	this.#addWhereCondition('OpAnd', conditionExpression)
	return this;
    }

    whereLessThan(field, value) {
	const conditionExpression = infixColumnLiteral(field, 'OpLessThan', value)
	this.#addWhereCondition('OpAnd', conditionExpression)
	return this;
    }

    whereLessThanOrEqual(field, value) {
	const conditionExpression = infixColumnLiteral(field, 'OpLessThanOrEqual', value)
	this.#addWhereCondition('OpAnd', conditionExpression)
	return this;
    }

    whereGreaterThan(field, value) {
	const conditionExpression = infixColumnLiteral(field, 'OpGreaterThan', value)
	this.#addWhereCondition('OpAnd', conditionExpression)
	return this;
    }

    whereGreaterThanOrEqual(field, value) {
	const conditionExpression = infixColumnLiteral(field, 'OpGreaterThanOrEqual', value)
	this.#addWhereCondition('OpAnd', conditionExpression)
	return this;
    }

    filterWhere() {
	return this.where.apply(this, Array.from(arguments))
    }

    filterWhereNot() {
	return this.whereNot.apply(this, Array.from(arguments))
    }

    filterWhereLessThan() {
	return this.whereLessThan.apply(this, Array.from(arguments))
    }

    filterWhereLessThanOrEqual() {
	return this.whereLessThanOrEqual.apply(this, Array.from(arguments))
    }

    filterWhereGreaterThan() {
	return this.whereGreaterThan.apply(this, Array.from(arguments))
    }

    filterWhereGreaterThanOrEqual() {
	return this.whereGreaterThanOrEqual.apply(this, Array.from(arguments))
    }

    or(conditionBuilder) {
	if (this.query.whereCondition === null) {
	    throw new Error('You are attempting to add a condition using `or`, but there are no previous conditions to apply the `or` to. You probably want `where` instead.')
	}
	const conditionExpression = conditionBuilder.build();
	this.#addWhereCondition('OpOr', conditionExpression)
	return this
    }

    and(conditionBuilder) {
	if (this.query.whereCondition === null) {
	    throw new Error('You are attempting to add a condition using `and`, but there are no previous conditions to apply the `and` to. You probably want `where` instead.')
	}
	const conditionExpression = conditionBuilder.build();
	this.#addWhereCondition('OpAnd', conditionExpression)
	return this
    }

    orderBy(column) {
        return this.orderByAsc(column);
    }

    orderByAsc(column) {
        this.query.orderByClause.push({ orderByColumn: column, orderByDirection: 'Asc' });

        return this;
    }

    orderByDesc(column) {
        this.query.orderByClause.push({ orderByColumn: column, orderByDirection: 'Desc' });

        return this;
    }

    limit(limit) {
        if (limit !== null && !Number.isInteger(limit)) {
            throw new Error('limit needs to be an integer, or null if no limit should be used');
        }
        this.query.limit = limit;

        return this;
    }

    offset(offset) {
        if (offset !== null && !Number.isInteger(offset)) {
            throw new Error('offset needs to be an integer, or null if no offset should be used');
        }
        this.query.offset = offset;

        return this;
    }

    async fetch() {
        const { result } = await DataSyncController.getInstance().sendMessage({
                tag: 'DataSyncQuery',
                query: this.query,
                transactionId: this.transactionId
            });
        return result;
    }

    async fetchOne() {
        const result = await this.limit(1).fetch();
        return result.length > 0 ? result[0] : null;
    }
    
    subscribe(callback) {
        const dataSubscription = new DataSubscription(this.query);
        dataSubscription.createOnServer();
        return dataSubscription.subscribe(callback)
    }
}

function query(table) {
    return new QueryBuilder(table);
}

function jsValueToDynamicValue(value) {
    if (typeof value === "string") {
        return { tag: 'TextValue', contents: value };
    } else if (typeof value === "number") {
        return { tag: Number.isInteger(value) ? 'IntValue' : 'DoubleValue', contents: value };
    } else if (typeof value === "boolean") {
        return { tag: 'BoolValue', contents: value };
    } else if (value === null || value === undefined) {
        return { tag: 'Null' };
    }

    throw new Error('Could no transform JS value to DynamicValue. Supported types: string, number, boolean, null, undefined');
}

export {
    QueryBuilder,
    query,
    ihpBackendUrl,
    fetchAuthenticated,
    filterWhere,
    where,
    filterWhereNot,
    whereNot,
    eq,
    notEq,
    or,
    and,
    lessThan,
    lessThanOrEqual,
    greaterThan,
    greaterThanOrEqual,
    whereLessThan,
    whereLessThanOrEqual,
    whereGreaterThan,
    whereGreaterThanOrEqual,
    filterWhereLessThan,
    filterWhereLessThanOrEqual,
    filterWhereGreaterThan,
    filterWhereGreaterThanOrEqual,
};
