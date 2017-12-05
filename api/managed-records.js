import fetch from "../util/fetch-fill";
import URI from "urijs";

// /records endpoint
window.path = "http://localhost:3000/records";


/**
 * @param {Object} record
 * @return {Object}
 */
function addIsPrimary(record) {
    return Object.assign({}, record, { isPrimary: isPrimary(record.color) });
}


/**
 * @param {string} path
 * @param {Object} options
 * @return {URI}
 */
function constructUrl(path, options) {
    return new URI(path).addSearch(options);
}


/**
 * @param {Object[]} records
 * @param {number} page
 * @return {Object}
 */
function formatRecords(records, page) {
    const formattedResponse = generateDefaultResponse();

    [formattedResponse.nextPage, records] = handleEleventhRecord(records, page);
    formattedResponse.ids = records.map(record => record.id);
    formattedResponse.open = handleOpenDispositions(records);
    formattedResponse.closedPrimaryCount = handleClosedDispositions(records);
    formattedResponse.previousPage = getPreviousPage(page);

    return formattedResponse;
}


/**
 * @return {Object}
 */
function generateDefaultResponse() {
    return {
        ids: [],
        open: [],
        closedPrimaryCount: 0,
        previousPage: null,
        nextPage: null
    };
}


/**
 * @param {number} page
 * @return {(number|null)}
 */
function getPreviousPage(page) {
    if (page !== 1) {
        return page - 1;
    }

    return null;
}


/**
 * @param {Object[]} records
 * @return {number}
 */
function handleClosedDispositions(records) {
    return records.reduce((acc, record) => {
        if (record.disposition === "closed" && isPrimary(record.color)) {
            return acc + 1;
        }

        return acc;
    }, 0);
}


/**
 * The eleventh record, if present, indicates that there is another page beyond
 * the one requested.
 *
 * However, we do not want to include the eleventh element in our processing
 * of the records array. We remove it here.
 *
 * @param {Object[]} records
 * @param {number} page
 * @return {array}
 */
function handleEleventhRecord(records, page) {
    if (records.length === 11) {
        return [page + 1, records.slice(0, -1)];
    }

    return [null, records];
}


/**
 * @param {Object[]} records
 * @return {Object[]}
 */
function handleOpenDispositions(records) {
    return records.filter(isOpenDisposition).map(addIsPrimary);
}


/**
 * @param {Object} response
 * @return {(Array|Promise<Object>)}
 */
function handleResponse(response) {
    if (response.status === 400) {
        return [];
    }

    return response.json();
}


/**
 * @param {Object} record
 * @return {boolean}
 */
function isOpenDisposition(record) {
    return record.disposition === "open";
}


/**
 * @param {string} color
 * @return {boolean}
 */
function isPrimary(color) {
    return ["blue", "red", "yellow"].includes(color);
}


/**
 * Provides a consistently formatted object for the translateOptions function.
 *
 * @param {Object} options
 * @return {Object}
 */
function prepOptions(options) {
    if (!options) {
        return {
            colors: [],
            page: 1
        };
    }

    if (!options.page) {
        options.page = 1;
    }

    if (!options.colors) {
        options.colors = [];
    }

    return options;
}


/**
 * @param {Object} options
 * @return {Promise<Object|undefined>}
 */
function retrieve(options) {
    const preppedOptions = prepOptions(options);
    const endpointOptions = translateOptions(preppedOptions);
    const requestUrl = constructUrl(window.path, endpointOptions);

    return fetch(requestUrl).then(response => {
        return handleResponse(response);
    }).then(records => {
        return formatRecords(records, preppedOptions.page);
    }).catch(error => {
        console.log("Something went wrong.", error.statusText);

        return;
    });
}


/**
 * @param {number} page
 * @return {number}
 */
function setOffset(page) {
    if (page === 1) {
        return 0;
    }

    return (page - 1) * 10;
}


/**
 * Takes a prepped set of options and returns a new set of options for the
 * records endpoint.
 *
 * @param {Object} options
 * @return {Object}
 */
function translateOptions(options) {
    const endpointOptions = {
        limit: 11
    };

    endpointOptions.offset = setOffset(options.page);
    endpointOptions["color[]"] = options.colors;

    return endpointOptions;
}


export default retrieve;
