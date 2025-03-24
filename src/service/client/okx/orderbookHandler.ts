// orderbookHandler.ts
import { ClientSettings, Orderbook, PriceLevel } from "../context";
import { isObjectEmpty } from "@/utils/bchelper";

export class OrderbookHandler {
    private symbol: string;
    private orderbook!: Orderbook;

    constructor(symbol: string) {
        this.symbol = symbol;
        this.orderbook = { bids: [], asks: [] };
    }

    // initialize
    public async initialize(obj: any) {
        const { id, contents } = obj;

        // bids
        if (contents.bids) {
            // this.orderbook.bids = this.mapAndSortOrders(contents, BookSide.BIDS)
            this.orderbook.bids = contents.bids;
        }
        // asks
        if (contents.asks) {
            // this.orderbook.asks = this.mapAndSortOrders(contents, BookSide.ASKS)
            this.orderbook.asks = contents.asks;
        }
    }

    // map and sort
    private mapAndSortOrders(contents: Orderbook, bookSide: BookSide): PriceLevel[] {
        const initData = bookSide === BookSide.BIDS ? contents.bids : contents.asks

        return initData
            .map(pl => ({ price: pl.price, size: pl.size }))
            .sort((a, b) =>
                bookSide === BookSide.BIDS ? b.price - a.price : a.price - b.price)
            .slice(0, ClientSettings.OrderbookLength);
    }

    // update
    public async update(obj: any) {
        const { id, contents } = obj;
        const symbol = id;

        if (!contents) {
            return;
        }
        // Update bids
        for (const item of contents) {
            let confirm = await isObjectEmpty(item.bids);
            if (!confirm) {
                const bid = item.bids[0];
                const price = parseFloat(bid[0]);
                const size = parseFloat(bid[1]);
                const index = this.orderbook.bids.findIndex(p => p.price === price);
                this.manageOrderUpdates(price, size, index, BookSide.BIDS, this.orderbook.bids);
                continue;
            }
            confirm = await isObjectEmpty(item.asks);
            if (!confirm) {
                const ask = item.asks[0];
                const price = parseFloat(ask[0]);
                const size = parseFloat(ask[1]);
                const index = this.orderbook.bids.findIndex(p => p.price === price);
                this.manageOrderUpdates(price, size, index, BookSide.ASKS, this.orderbook.asks);
                continue;
            }
        }
    }

    /**
     * Manages updates to a specific side of the order book.
     * @param price - The price of the order to update.
     * @param size - The size of the order to update. If the size is 0, the order is removed.
     * @param index - The index of the existing order in the order book. If -1, it's a new order.
     * @param bookSide - The side of the book being updated ("bids" or "asks").
     * @param updateOrderbook - The current state of the order book side being updated.
     * @returns The updated and sorted array of price levels.
     */
    private manageOrderUpdates(price: number, size: number, index: number, bookSide: BookSide, updateOrderbook: PriceLevel[]) {
        if (size > 0) {
            if (index !== -1) {
                updateOrderbook[index].size = size;
            } else {
                // Insert in sorted order
                const insertionIndex = this.findInsertionIndex(price, updateOrderbook, bookSide);
                updateOrderbook.splice(insertionIndex, 0, { price, size });
            }
            // Ensure only top 20 orders are kept
            if (updateOrderbook.length > ClientSettings.OrderbookLength) {
                // Trim the order book to 20 elements
                updateOrderbook.length = ClientSettings.OrderbookLength;
            }
        } else if (index !== -1) {
            updateOrderbook.splice(index, 1);
        }
    }

    /**
     * Finds the correct insertion index for a new price level in a sorted order book.
     * This method uses a binary search algorithm to efficiently find the position.
     * @param price The price of the new order to insert.
     * @param orderbook The current state of the order book (bids or asks).
     * @param bookSide The side of the book being updated (bids or asks).
     * @returns The index at which the new price level should be inserted.
     */
    private findInsertionIndex(price: number, orderbook: PriceLevel[], bookSide: BookSide): number {
        let start = 0;
        let end = orderbook.length - 1;

        while (start <= end) {
            const mid = Math.floor((start + end) / 2);
            const midPrice = orderbook[mid].price;

            if (midPrice === price) {
                // Exact match found, return this index
                return mid;
            }

            if (bookSide === BookSide.BIDS) {
                // For bids, the order is descending
                if (price > midPrice) {
                    end = mid - 1;
                } else {
                    start = mid + 1;
                }
            } else {
                // For asks, the order is ascending
                if (price < midPrice) {
                    end = mid - 1;
                } else {
                    start = mid + 1;
                }
            }
        }

        // If we don't find an exact match, return the start index
        // This is where the new price level should be inserted to maintain order
        return start;
    }

    // 
    public getOrderbook(): Orderbook {
        return this.orderbook;
    }
}

export enum BookSide {
    BIDS = "bids",
    ASKS = "asks"
}