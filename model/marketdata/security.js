"use strict";

const flags = require("../flags"),
      MarketData = require("./marketdata"),
      Quote = require("./quote"),
      Depth = require("./depth"),
      Charts = require("./charts"),
      Order = require("./order");

class Security extends MarketData {
    
    constructor(session, contract) {
        super(session, contract);
        
        this.quote = new Quote(session, contract);
        this.depth = new Depth(session, contract);
        this.charts = new Charts(session, contract, flags.HISTORICAL.trades);
        this.reports = { };
    }
    
    fundamentals(type, cb) {
        this.service.fundamentalData(this.contract.summary, flags.FUNDAMENTALS_REPORTS[type])
            .once("data", data => {
                this.reports[type] = data;
                if (cb) cb(null, data);
            })
            .once("end", () => {
                if (cb) cb(new Error("Could not load " + type + " fundamental data for " + this.contract.localSymbol + ". " + err.message))
            })
            .once("error", err => {
                if (cb) cb(new Error("Could not load " + type + " fundamental data for " + this.contract.localSymbol + ". " + err.message))
            })
            .send();
    }
    
    order() {
        return new Order(this.session, this.contract);
    }
    
    cancel() {
        if (this.quote) this.quote.cancel();
        if (this.depth) this.depth.cancel();
        if (this.charts) this.charts.cancel();
    }
    
}

function securities(session, description, cb) {
    session.details(description, (err, contracts) => {
        if (err) cb(err);
        else cb(null, contracts.map(contract => new Security(session, contract)));
    });
}

module.exports = securities;