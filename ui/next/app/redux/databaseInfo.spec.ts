import { assert } from "chai";
import * as proxyquire from "proxyquire";
import { Dispatch } from "redux";
import * as _ from "lodash";

import * as databases from "./databaseInfo";
import * as protos from "../js/protos";
import { Action } from "../interfaces/action";

type DatabasesResponse = cockroach.server.DatabasesResponse;

type DatabaseDetailsRequest = cockroach.server.DatabaseDetailsRequest;
type TableDetailsRequest = cockroach.server.TableDetailsRequest;

type DatabaseDetailsResponse = cockroach.server.DatabaseDetailsResponse;
type TableDetailsResponse = cockroach.server.TableDetailsResponse;

type DatabasesResponseMessage = cockroach.server.DatabasesResponseMessage;
type DatabaseDetailsResponseMessage = cockroach.server.DatabaseDetailsResponseMessage;
type TableDetailsResponseMessage = cockroach.server.TableDetailsResponseMessage;

describe("databases reducers", function () {
  describe("actions", function () {
    it("requestDatabases() creates the correct action type.", function () {
      assert.equal(databases.requestDatabases().type, databases.DATABASES_REQUEST);
    });

    it("receiveDatabases() creates the correct action type.", function () {
      assert.equal(databases.receiveDatabases(null).type, databases.DATABASES_RECEIVE);
    });

    it("errorDatabases() creates the correct action type.", function () {
      assert.equal(databases.errorDatabases(null).type, databases.DATABASES_ERROR);
    });

    it("invalidateDatabases() creates the correct action type.", function () {
      assert.equal(databases.invalidateDatabases().type, databases.DATABASES_INVALIDATE);
    });
  });

  describe("database details actions", function () {
    it("requestDatabaseDetails() creates the correct action type.", function () {
      assert.equal(databases.requestDatabaseDetails(null).type, databases.DATABASE_DETAILS_REQUEST);
    });

    it("receiveDatabaseDetails() creates the correct action type.", function () {
      assert.equal(databases.receiveDatabaseDetails(null, null).type, databases.DATABASE_DETAILS_RECEIVE);
    });

    it("errorDatabaseDetails() creates the correct action type.", function () {
      assert.equal(databases.errorDatabaseDetails(null, null).type, databases.DATABASE_DETAILS_ERROR);
    });

    it("invalidateDatabaseDetails() creates the correct action type.", function () {
      assert.equal(databases.invalidateDatabaseDetails(null).type, databases.DATABASE_DETAILS_INVALIDATE);
    });
  });

  describe("table id generator", function () {
    it("generates encoded db/table id", function () {
      assert.equal(databases.generateTableID("a.a.a.a", "a.a.a"), encodeURIComponent("a.a.a.a") + "/" + encodeURIComponent("a.a.a"));
    });
  });

  describe("table details actions", function () {
    it("requestTableDetails() creates the correct action type.", function () {
      let action = databases.requestTableDetails("db", "table");
      assert.equal(action.type, databases.TABLE_DETAILS_REQUEST);
      let [db, table] = action.payload.id.split("/");
      assert.equal(decodeURIComponent(db), "db");
      assert.equal(decodeURIComponent(table), "table");
      assert.equal(databases.generateTableID("db", "table"), action.payload.id);
    });

    it("receiveTableDetails() creates the correct action type.", function () {
      let action = databases.receiveTableDetails("db", "table", null);
      assert.equal(action.type, databases.TABLE_DETAILS_RECEIVE);
      let [db, table] = action.payload.id.split("/");
      assert.equal(decodeURIComponent(db), "db");
      assert.equal(decodeURIComponent(table), "table");
      assert.equal(databases.generateTableID("db", "table"), action.payload.id);
      assert.equal(action.payload.data, null);
    });

    it("errorTableDetails() creates the correct action type.", function () {
      let e: Error = new Error();
      let action = databases.errorTableDetails("db", "table", e);
      assert.equal(action.type, databases.TABLE_DETAILS_ERROR);
      let [db, table] = action.payload.id.split("/");
      assert.equal(decodeURIComponent(db), "db");
      assert.equal(decodeURIComponent(table), "table");
      assert.equal(databases.generateTableID("db", "table"), action.payload.id);
      assert.equal(action.payload.data, e);
    });

    it("invalidateTableDetails() creates the correct action type.", function () {
      let action = databases.invalidateTableDetails("db", "table");
      assert.equal(action.type, databases.TABLE_DETAILS_INVALIDATE);
      let [db, table] = action.payload.id.split("/");
      assert.equal(decodeURIComponent(db), "db");
      assert.equal(decodeURIComponent(table), "table");
      assert.equal(databases.generateTableID("db", "table"), action.payload.id);
    });
  });

  describe("reducers", function () {
    describe("databases reducer", function () {
      let state: databases.DatabasesState;

      beforeEach(() => {
        state = databases.databasesReducer(undefined, { type: "unknown" });
      });

      it("should have the correct default value.", function () {
        let expected = {
          inFlight: false,
          valid: false,
        };
        assert.deepEqual(state, expected);
      });

      it("should correctly dispatch requestDatabases", function () {
        state = databases.databasesReducer(state, databases.requestDatabases());
        assert.isTrue(state.inFlight);
        assert.isUndefined(state.lastError);
        assert.isUndefined(state.data);
        assert.isFalse(state.valid);
      });

      it("should correctly dispatch receiveDatabases", function () {
        let dbs = new protos.cockroach.server.DatabasesResponse({ databases: ["db1", "db2"] });
        state = databases.databasesReducer(state, databases.receiveDatabases(dbs));
        assert.isFalse(state.inFlight);
        assert.isNull(state.lastError);
        assert.deepEqual(state.data, dbs);
        assert.isTrue(state.valid);
      });

      it("should correctly dispatch errorDatabases", function () {
        let dbErr = new Error();
        state = databases.databasesReducer(state, databases.errorDatabases(dbErr));
        assert.isFalse(state.inFlight);
        assert.isUndefined(state.data);
        assert.deepEqual(state.lastError, dbErr);
        assert.isFalse(state.valid);
      });

      it("should correctly dispatch invalidateDatabases", function () {
        state = databases.databasesReducer(state, databases.invalidateDatabases());
        assert.isFalse(state.valid);
        assert.isUndefined(state.lastError);
        assert.isUndefined(state.data);
        assert.isFalse(state.inFlight);
      });
    });

    describe("database details reducer", function () {
      let state: databases.DatabaseDetailsState;
      let dbName = "db";

      beforeEach(() => {
        state = databases.singleDatabaseDetailsReducer(undefined, { type: "unknown" });
      });

      it("should have the correct default value.", function () {
        let expected = {
          inFlight: false,
          valid: false,
        };
        assert.deepEqual(state, expected);
      });

      it("should correctly dispatch requestDatabaseDetails", function () {
        state = databases.singleDatabaseDetailsReducer(state, databases.requestDatabaseDetails(dbName));
        assert.isTrue(state.inFlight);
        assert.isUndefined(state.lastError);
        assert.isUndefined(state.data);
        assert.isFalse(state.valid);
      });

      it("should correctly dispatch receiveDatabaseDetails", function () {
        let dbs = new protos.cockroach.server.DatabaseDetailsResponse({
          table_names: ["table1", "table2"],
          grants: [{ user: "root", privileges: ["ALL"] }, { user: "user", privileges: ["CREATE", "DROP"] }],
        });
        state = databases.singleDatabaseDetailsReducer(state, databases.receiveDatabaseDetails(dbName, dbs));
        assert.isFalse(state.inFlight);
        assert.isNull(state.lastError);
        assert.deepEqual(state.data, dbs);
        assert.isTrue(state.valid);
      });

      it("should correctly dispatch errorDatabaseDetails", function () {
        let dbErr = new Error();
        state = databases.singleDatabaseDetailsReducer(state, databases.errorDatabaseDetails(dbName, dbErr));
        assert.isFalse(state.inFlight);
        assert.isUndefined(state.data);
        assert.deepEqual(state.lastError, dbErr);
        assert.isFalse(state.valid);
      });

      it("should correctly dispatch invalidateDatabaseDetails", function () {
        state = databases.singleDatabaseDetailsReducer(state, databases.invalidateDatabaseDetails(dbName));
        assert.isFalse(state.valid);
        assert.isUndefined(state.lastError);
        assert.isUndefined(state.data);
        assert.isFalse(state.inFlight);
      });
    });

    describe("table details reducer", function () {
      let state: databases.TableDetailsState;
      let dbName = "db";
      let tableName = "table";

      beforeEach(() => {
        state = databases.singleTableDetailsReducer(undefined, { type: "unknown" });
      });

      it("should have the correct default value.", function () {
        let expected = {
          inFlight: false,
          valid: false,
        };
        assert.deepEqual(state, expected);
      });

      it("should correctly dispatch requestTableDetails", function () {
        state = databases.singleTableDetailsReducer(state, databases.requestTableDetails(dbName, tableName));
        assert.isTrue(state.inFlight);
        assert.isUndefined(state.lastError);
        assert.isUndefined(state.data);
        assert.isFalse(state.valid);
      });

      it("should correctly dispatch receiveTableDetails", function () {
        let dbs = new protos.cockroach.server.TableDetailsResponse({ columns: [], indexes: [], grants: [] });
        state = databases.singleTableDetailsReducer(state, databases.receiveTableDetails(dbName, tableName, dbs));
        assert.isFalse(state.inFlight);
        assert.isNull(state.lastError);
        assert.deepEqual(state.data, dbs);
        assert.isTrue(state.valid);
      });

      it("should correctly dispatch errorTableDetails", function () {
        let dbErr = new Error();
        state = databases.singleTableDetailsReducer(state, databases.errorTableDetails(dbName, tableName, dbErr));
        assert.isFalse(state.inFlight);
        assert.isUndefined(state.data);
        assert.deepEqual(state.lastError, dbErr);
        assert.isFalse(state.valid);
      });

      it("should correctly dispatch invalidateTableDetails", function () {
        state = databases.singleTableDetailsReducer(state, databases.invalidateTableDetails(dbName, tableName));
        assert.isFalse(state.valid);
        assert.isUndefined(state.lastError);
        assert.isUndefined(state.data);
        assert.isFalse(state.inFlight);
      });
    });

    describe("all table details reducer", function () {
      let state: databases.AllTableDetailsState;

      let dbName = "db";
      let tableName = "table";

      beforeEach(() => {
        state = databases.allTablesDetailsReducer(undefined, { type: "unknown" });
      });

      it("should have the correct default value.", function () {
        let expected = {};
        assert.deepEqual(state, expected);
      });

      it("should correctly dispatch requestTableDetails", function () {
        let action = databases.requestTableDetails(dbName, tableName);
        state = databases.allTablesDetailsReducer(state, action);
        assert.property(state, databases.generateTableID(dbName, tableName));
        let detailState = databases.singleTableDetailsReducer(undefined, action);
        assert.deepEqual(state[databases.generateTableID(dbName, tableName)], detailState);
      });

      it("should correctly dispatch receiveTableDetails", function () {
        let action = databases.receiveTableDetails(dbName, tableName, new protos.cockroach.server.TableDetailsResponse({}));
        state = databases.allTablesDetailsReducer(state, action);
        assert.property(state, databases.generateTableID(dbName, tableName));
        let detailState = databases.singleTableDetailsReducer(undefined, action);
        assert.deepEqual(state[databases.generateTableID(dbName, tableName)], detailState);
      });

      it("should correctly dispatch errorTableDetails", function () {
        let action = databases.errorTableDetails(dbName, tableName, new Error());
        state = databases.allTablesDetailsReducer(state, action);
        assert.property(state, databases.generateTableID(dbName, tableName));
        let detailState = databases.singleTableDetailsReducer(undefined, action);
        assert.deepEqual(state[databases.generateTableID(dbName, tableName)], detailState);
      });

      it("should correctly dispatch invalidateTableDetails", function () {
        let action = databases.invalidateTableDetails(dbName, tableName);
        state = databases.allTablesDetailsReducer(state, action);
        assert.property(state, databases.generateTableID(dbName, tableName));
        let detailState = databases.singleTableDetailsReducer(undefined, action);
        assert.deepEqual(state[databases.generateTableID(dbName, tableName)], detailState);
      });
    });

    describe("all database details reducer", function () {
      let state: databases.AllDatabaseDetailsState;

      let dbName = "db";

      beforeEach(() => {
        state = databases.allDatabaseDetailsReducer(undefined, { type: "unknown" });
      });

      it("should have the correct default value.", function () {
        let expected = {};
        assert.deepEqual(state, expected);
      });

      it("should correctly dispatch requestDatabaseDetails", function () {
        let action = databases.requestDatabaseDetails(dbName);
        state = databases.allDatabaseDetailsReducer(state, action);
        assert.property(state, dbName);
        let detailState = databases.singleDatabaseDetailsReducer(undefined, action);
        assert.deepEqual(state[dbName], detailState);
      });

      it("should correctly dispatch receiveDatabaseDetails", function () {
        let action = databases.receiveDatabaseDetails(dbName, new protos.cockroach.server.DatabaseDetailsResponse({}));
        state = databases.allDatabaseDetailsReducer(state, action);
        assert.property(state, dbName);
        let detailState = databases.singleDatabaseDetailsReducer(undefined, action);
        assert.deepEqual(state[dbName], detailState);
      });

      it("should correctly dispatch errorDatabaseDetails", function () {
        let action = databases.errorDatabaseDetails(dbName, new Error());
        state = databases.allDatabaseDetailsReducer(state, action);
        assert.property(state, dbName);
        let detailState = databases.singleDatabaseDetailsReducer(undefined, action);
        assert.deepEqual(state[dbName], detailState);
      });

      it("should correctly dispatch invalidateDatabaseDetails", function () {
        let action = databases.invalidateDatabaseDetails(dbName);
        state = databases.allDatabaseDetailsReducer(state, action);
        assert.property(state, dbName);
        let detailState = databases.singleDatabaseDetailsReducer(undefined, action);
        assert.deepEqual(state[dbName], detailState);
      });
    });
  });

  describe("async action creators", function () {
    let databasesMocked: {
      refreshDatabases: () => (d: Dispatch, gs: () => any) => Promise<void>;
      refreshDatabaseDetails: (db: string) => (d: Dispatch, gs: () => any) => Promise<void>;
      refreshTableDetails: (db: string, table: string) => (d: Dispatch, gs: () => any) => Promise<void>;
    };

    let state: { databaseInfo: databases.DatabaseInfoState; };

    describe("refresh databases", function () {
      let dispatch = (action: Action) => {
        state.databaseInfo.databases = databases.databasesReducer(state.databaseInfo.databases, action);
      };
      let databaseList = ["db1", "db2"];
      let response: DatabasesResponseMessage;
      let error: Error;
      beforeEach(function () {
        state = { databaseInfo: new databases.DatabaseInfoState() };
        response = new protos.cockroach.server.DatabasesResponse({ databases: databaseList });
      });

      it("refreshes database list", function () {
        function getDatabaseList(): Promise<DatabasesResponseMessage> {
          return new Promise((resolve, reject) => {
            assert.deepEqual(state.databaseInfo.databases, { inFlight: true, valid: false });
            resolve(response);
          });
        }

        databasesMocked = proxyquire.load("./databaseInfo", {
          "../util/api": {
            getDatabaseList,
          },
        });

        return databasesMocked.refreshDatabases()(dispatch, () => state).then(() => {
          assert.deepEqual(state.databaseInfo.databases.data.databases, databaseList );
          assert.deepEqual(state.databaseInfo.databases, {
            inFlight: false,
            valid: true,
            data: response,
            lastError: null,
          });
        });
      });

      it("handles database list errors", function () {
        error = new Error();
        function getDatabaseList(): Promise<DatabasesResponseMessage> {
          return new Promise((resolve, reject) => {
            reject(error);
          });
        }

        databasesMocked = proxyquire.load("./databaseInfo", {
          "../util/api": {
            getDatabaseList,
          },
        });

        return databasesMocked.refreshDatabases()(dispatch, () => state).then(() => {
          assert.deepEqual(state.databaseInfo.databases, { valid: false, inFlight: false, lastError: error });
        });
      });
    });

    describe("refresh database details", function () {
      let dispatch = (action: Action) => {
        state.databaseInfo.databaseDetails = databases.allDatabaseDetailsReducer(state.databaseInfo.databaseDetails, action);
      };
      let DB1 = "db1";
      let DB2 = "db2";

      let dbs: {[dbName: string]: DatabaseDetailsResponse} = {
        [DB1]: {
          table_names: ["table1", "table2"],
          grants: [{ user: "User1", privileges: ["U1GRANT1", "U1GRANT2"] }, { user: "User2", privileges: ["U2GRANT1", "U2GRANT2"] }],
        },
        [DB2]: {
          table_names: ["table3", "table4"],
          grants: [{ user: "User3", privileges: ["U3GRANT1", "U3GRANT2"] }, { user: "User4", privileges: ["U4GRANT1", "U4GRANT2"] }],
        },
      };

      beforeEach(function () {
        state = { databaseInfo: new databases.DatabaseInfoState() };
      });

      it("refreshes database details for different databases", function () {
        return Promise.all(_.map([DB1, DB2], (db: string) => {
          let response: DatabaseDetailsResponseMessage;

          function getDatabaseDetails(req: DatabaseDetailsRequest): Promise<DatabaseDetailsResponseMessage> {
            return new Promise((resolve, reject) => {
              assert.deepEqual(state.databaseInfo.databaseDetails[req.database], { inFlight: true, valid: false });
              response = new protos.cockroach.server.DatabaseDetailsResponse(dbs[req.database]);
              resolve(response);
            });
          }

          databasesMocked = proxyquire.load("./databaseInfo", {
            "../util/api": {
              getDatabaseDetails,
            },
          });

          return databasesMocked.refreshDatabaseDetails(db)(dispatch, () => state).then(() => {
            assert.deepEqual(state.databaseInfo.databaseDetails[db].data, new protos.cockroach.server.DatabaseDetailsResponse(dbs[db]));
            assert.deepEqual(state.databaseInfo.databaseDetails[db], {
              inFlight: false,
              valid: true,
              data: response,
              lastError: null,
            });
          });
        }));
      });

      it("handles database details errors", function () {
        return Promise.all(_.map([DB1, DB2], (db: string) => {
          let error: Error;

          function getDatabaseDetails(req: DatabaseDetailsRequest): Promise<DatabaseDetailsResponseMessage> {
            return new Promise((resolve, reject) => {
              assert.deepEqual(state.databaseInfo.databaseDetails[req.database], { inFlight: true, valid: false });
              error = new Error();
              reject(error);
            });
          }

          databasesMocked = proxyquire.load("./databaseInfo", {
            "../util/api": {
              getDatabaseDetails,
            },
          });

          return databasesMocked.refreshDatabaseDetails(db)(dispatch, () => state).then(() => {
            assert.deepEqual(state.databaseInfo.databaseDetails[db], {
              inFlight: false,
              valid: false,
              lastError: error,
            });
          });
        }));
      });

    });

    describe("refresh table details", function () {
      let dispatch = (action: Action) => {
        state.databaseInfo.tableDetails = databases.allTablesDetailsReducer(state.databaseInfo.tableDetails, action);
      };
      let DB1 = "a";
      let DB2 = "a.a";
      let table1 = "a.a";
      let table2 = "a";

      let DB3 = "a";
      let DB4 = "a/a";
      let table3 = "a/a";
      let table4 = "a";

      let dbTables: { [db: string]: { [table: string]: TableDetailsResponse}} = {
        [DB1]: {
          [table1]: new protos.cockroach.server.TableDetailsResponse(),
        },
        [DB2]: {
          [table2]: new protos.cockroach.server.TableDetailsResponse(),
        },
        [DB3]: {
          [table3]: new protos.cockroach.server.TableDetailsResponse(),
        },
        [DB4]: {
          [table4]: new protos.cockroach.server.TableDetailsResponse(),
        },
      };

      interface TableID {
        db: string;
        table: string;
      }

      let tableList = _.flatten(_.map(dbTables, (tables, db) => {
        return _.map(tables, (tableValue, table): TableID => {
          return { db, table };
        });
      }));

      beforeEach(function () {
        state = { databaseInfo: new databases.DatabaseInfoState() };
      });

      it("refreshes table details for different tables", function () {
        return Promise.all(_.map(tableList, (id: TableID) => {
          let response: TableDetailsResponse;

          function getTableDetails(req: TableDetailsRequest): Promise<TableDetailsResponseMessage> {
            return new Promise((resolve, reject) => {
              assert.deepEqual(state.databaseInfo.tableDetails[databases.generateTableID(id.db, id.table)], { inFlight: true, valid: false });
              response = new protos.cockroach.server.TableDetailsResponse(dbTables[databases.generateTableID(req.database, req.table)]);
              resolve(response);
            });
          }

          databasesMocked = proxyquire.load("./databaseInfo", {
            "../util/api": {
              getTableDetails,
            },
          });

          return databasesMocked.refreshTableDetails(id.db, id.table)(dispatch, () => state).then(() => {
            let generatedID = databases.generateTableID(id.db, id.table);
            assert.deepEqual(state.databaseInfo.tableDetails[generatedID].data, new protos.cockroach.server.TableDetailsResponse(dbTables[id.db][id.table]));
            assert.deepEqual(state.databaseInfo.tableDetails[generatedID], {
              inFlight: false,
              valid: true,
              data: response,
              lastError: null,
            });
          });
        }));
      });

      it("handles table details errors", function () {
        return Promise.all(_.map(tableList, (id: TableID) => {
          let error: Error;

          function getTableDetails(req: TableDetailsRequest): Promise<TableDetailsResponseMessage> {
            return new Promise((resolve, reject) => {
              assert.deepEqual(state.databaseInfo.tableDetails[databases.generateTableID(id.db, id.table)], { inFlight: true, valid: false });
              error = new Error();
              reject(error);
            });
          }

          databasesMocked = proxyquire.load("./databaseInfo", {
            "../util/api": {
              getTableDetails,
            },
          });

          return databasesMocked.refreshTableDetails(id.db, id.table)(dispatch, () => state).then(() => {
            let generatedID = databases.generateTableID(id.db, id.table);
            assert.deepEqual(state.databaseInfo.tableDetails[generatedID], {
              inFlight: false,
              valid: false,
              lastError: error,
            });
          });
        }));
      });

    });
  });
});
