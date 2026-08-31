/**
 * Binance API Joi Schemas
 * Validation schemas for all Binance endpoints
 */

import Joi from 'joi';
import { OrderSide, OrderType, TimeInForce } from '../types/binance.ts';

/**
 * Schema for creating a new order (POST /api/binance/order)
 */
export const createOrderSchema = Joi.object({
    symbol: Joi.string().required().uppercase(),
    side: Joi.string().valid(...Object.values(OrderSide)).required().messages({
        'any.only': 'Side must be BUY or SELL',
    }),
    type: Joi.string().valid(...Object.values(OrderType)).required().messages({
        'any.only': 'Invalid order type',
    }),
    quantity: Joi.string().required(),
    price: Joi.string().when('type', {
        is: OrderType.LIMIT,
        then: Joi.required().messages({
            'any.required': 'Price is required for LIMIT orders',
        }),
        otherwise: Joi.optional(),
    }),
    timeInForce: Joi.string()
        .valid(...Object.values(TimeInForce))
        .when('type', {
            is: OrderType.LIMIT,
            then: Joi.required().messages({
                'any.required': 'TimeInForce is required for LIMIT orders',
            }),
            otherwise: Joi.optional(),
        }),
    newClientOrderId: Joi.string().optional(),
});

/**
 * Schema for getting all orders (GET /api/binance/orders)
 */
export const getAllOrdersSchema = Joi.object({
    symbol: Joi.string().required().uppercase(),
    orderId: Joi.number().integer().positive().optional(),
    startTime: Joi.number().integer().positive().optional(),
    endTime: Joi.number().integer().positive().optional(),
    limit: Joi.number().integer().min(1).max(1000).default(500),
});

/**
 * Schema for getting price (GET /api/binance/price)
 */
export const getPriceSchema = Joi.object({
    symbol: Joi.string().required().uppercase(),
});
