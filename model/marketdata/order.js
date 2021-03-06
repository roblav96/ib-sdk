"use strict";

const MarketData = require("./marketdata"),
      flags = require("../flags");

class Order extends MarketData {
    
    constructor(session, contract) {
        super(session, contract);
        Object.defineProperty(this, "children", { value: [ ] });
        
        this.ticket = { 
            tif: flags.TIME_IN_FORCE.day,
            totalQuantity: 1,
            action: flags.SIDE.buy,
            type: flags.ORDER_TYPE.market
        };
    }
    
    or(cb) {
        if (this.ocaGroup == null) {
            let group = Math.floor(Math.random * 1000000).toString();
            this.ocaGroup = group;
            this.oraType = flags.OCA_TYPE.cancel;
        }
        
        let siblingOrder = new Order(this.session, this.contract);
        siblingOrder.ocaGroup = this.ocaGroup;
        siblingOrder.ocaType = flags.OCA_TYPE.cancel;
        
        if (cb && typeof cb == "function") {
            cb(siblingOrder);
            return this;
        }
        else {
            return siblingOrder;
        }
    }
    
    then(cb) {
        let childOrder = new Order(this.session, this.contract);
        childOrder.parent = this;
        this.children.push(childOrder);
        
        if (cb && typeof cb == "function") {
            cb(childOrder);
            return this;
        }
        else {
            return childOrder;
        }
    }
    
    ////////////////////////////////////////
    // QUANTITY
    ////////////////////////////////////////
    trade(qty, show) {
        this.ticket.totalQuantity = Math.abs(qty);
        this.ticket.action = qty > 0 ? flags.SIDE.buy : flags.SIDE.sell;
        
        if (show != null) {
            if (show == 0) this.hidden = true;
            this.displaySize = Math.abs(show);
        }
        
        return this;
    }
    
    buy(qty, show) {
        this.ticket.totalQuantity = qty;
        this.ticket.action = flags.SIDE.buy;
        
        if (show != null) {
            if (show == 0) this.hidden = true;
            this.displaySize = Math.abs(show);
        }
        
        return this;
    }
    
    sell(qty, show) {
        this.ticket.totalQuantity = qty;
        this.ticket.action = flags.SIDE.sell;
        
        if (show != null) {
            if (show == 0) this.hidden = true;
            this.displaySize = Math.abs(show);
        }
        
        return this;
    }
    
    show(qty) {
        if (show != null) {
            if (show == 0) this.hidden = true;
            this.displaySize = Math.abs(show);
        }

        return this;
    }
    
    ////////////////////////////////////////
    // PRICE
    ////////////////////////////////////////
    type(orderType) {
        this.ticket.type = orderType;
    }
    
    market() {
        this.ticket.type = flags.ORDER_TYPE.market;
        return this;
    }
    
    marketProtect() {
        this.ticket.type = flags.ORDER_TYPE.marketProtect;
        return this;
    }
    
    marketToLimit() {
        this.ticket.type = flags.ORDER_TYPE.marketToLimit;
        return this;
    }
    
    auction() {
        this.ticket.type = flags.ORDER_TYPE.marketToLimit;
        this.ticket.tif = flags.TIME_IN_FORCE.auction;
    }
    
    marketIfTouched(price) {
        this.ticket.type = flags.ORDER_TYPE.marketIfTouched;
        this.ticket.auxPrice = price;
        return this;
    }
    
    marketOnClose() {
        this.ticket.type = flags.ORDER_TYPE.marketOnClose;
        return this;
    }
    
    marketOnOpen() {
        this.ticket.type = flags.ORDER_TYPE.market;
        this.ticket.tif = flags.TIME_IN_FORCE.open;
        return this;
    }
    
    limit(price, discretionaryAmount) {
        this.ticket.type = flags.ORDER_TYPE.limit;
        this.ticket.lmtPrice = price;
        if (discretionaryAmount) {
            this.ticket.discretionaryAmt = discretionaryAmount;
        }

        return this;
    }
    
    limitIfTouched(trigger, limit) {
        this.ticket.type = flags.ORDER_TYPE.limitIfTouched;
        this.ticket.auxPrice = trigger;
        this.ticket.lmtPrice = limit;
        return this;
    }
    
    limitOnClose(price) {
        this.ticket.type = flags.ORDER_TYPE.limitOnClose;
        this.ticket.lmtPrice = price;
        return this;
    }
    
    limitOnOpen(price) {
        this.ticket.type = flags.ORDER_TYPE.limit;
        this.ticket.tif = flags.TIME_IN_FORCE.open;
        this.ticket.lmtPrice = price;
        return this;
    }
    
    stop(trigger) {
        this.ticket.type = flags.ORDER_TYPE.stop;
        this.ticket.auxPrice = trigger;
        return this;
    }
    
    stopProtect(trigger) {
        this.ticket.type = flags.ORDER_TYPE.stopProtect;
        this.ticket.auxPrice = trigger;
        return this;
    }
    
    stopLimit(trigger, limit) {
        this.ticket.type = flags.ORDER_TYPE.stopLimit;
        this.ticket.auxPrice = trigger;
        this.ticket.lmtPrice = limit;            
        return this;
    }

    ////////////////////////////////////////
    // TIMEFRAME
    ////////////////////////////////////////
    goodToday() {
        this.ticket.tif = flags.TIME_IN_FORCE.day;
        return this;
    }
    
    goodUntilCancelled() {
        this.ticket.tif = flags.TIME_IN_FORCE.goodUntilCancelled;
        return this;
    }
    
    immediateOrCancel() {
        this.ticket.tif = flags.TIME_IN_FORCE.immediateOrCancel;
        return this;
    }
    
    fillOrKill() {
        this.ticket.tif = flags.TIME_IN_FORCE.fillOrKill;
        return this;
    }
    
    atTheOpen() {
        this.ticket.tif = flags.TIME_IN_FORCE.open;
    }
    
    auction() {
        this.ticket.tif = flags.TIME_IN_FORCE.auction;
    }
    
    outsideRegularTradingHours() { 
        this.ticket.outsideRth = true; 
        return this; 
    }
    
    ////////////////////////////////////////
    // EXECUTION
    ////////////////////////////////////////
    overridePercentageConstraints() {
        this.ticket.overridePercentageConstraints = true;
        return this;
    }
    
    setup() {
        let me = this, 
            nextId = this.service.nextValidId(1);
        
        nextId.on("data", id => {
            nextId.cancel();
            
            this.ticket.orderId = id;
            if (this.children.length) {
                this.children.forEach(child => {
                    child.parentId = id;
                    delete child.parent;
                });
            }
            
            let request = this.service.placeOrder(this.contract, this.ticket);
            me.cancel = () => request.cancel();
            
            request.on("data", data => {
                Object.merge(me, data, { resolve: true });
            }).on("error", err => {
                me.error = err;
                me.emit("error", err);
            }).send();
        }).on("error", err => cb(err)).send();
    }
    
    transmit() {
        this.ticket.transmit = true;
        this.setup();
    }
    
}

module.exports = Order;