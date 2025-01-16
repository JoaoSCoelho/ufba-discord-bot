import BaseError from './BaseError';

export default class HandledError extends BaseError {
    handled = true;
}