import { useState, useEffect } from "react";
import { TableService } from "../services/TableService";
import type { Table } from "../services/TableService";

export const useTableController = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTables = async () => {
    try {
      setLoading(true);
      setError(null);
      const tablesData = await TableService.getTables();
      setTables(tablesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tables");
    } finally {
      setLoading(false);
    }
  };

  const updateTableInState = (tableId: number, status: Table["status"]) => {
    setTables((prev) =>
      prev.map((table) => (table.id === tableId ? { ...table, status } : table))
    );
  };

  const handleTableOperation = async (
    operation: () => Promise<void>,
    tableId: number,
    newStatus: Table["status"],
    errorMessage: string
  ) => {
    try {
      await operation();
      updateTableInState(tableId, newStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : errorMessage);
      throw err;
    }
  };

  const openAllTables = async () => {
    try {
      setLoading(true);
      setError(null);

      const occupiedTables = tables.filter(
        (table) => table.status === "occupied"
      );

      if (occupiedTables.length === 0) {
        return { success: true, message: "โต๊ะทั้งหมดว่างอยู่แล้ว" };
      }

      const updatePromises = occupiedTables.map((table) =>
        TableService.updateTableStatus(table.id, "free")
      );

      await Promise.all(updatePromises);
      await fetchTables();

      return {
        success: true,
        message: `เปิดโต๊ะทั้งหมดแล้ว (${occupiedTables.length} โต๊ะ)`,
      };
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to open all tables"
      );
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const occupyTable = (tableId: number) =>
    handleTableOperation(
      () => TableService.occupyTable(tableId),
      tableId,
      "occupied",
      "Failed to occupy table"
    );

  const updateTableStatus = (tableId: number, status: string) =>
    handleTableOperation(
      () => TableService.updateTableStatus(tableId, status),
      tableId,
      status as Table["status"],
      "Failed to update table"
    );

  const freeTable = (tableId: number) =>
    handleTableOperation(
      () => TableService.freeTable(tableId),
      tableId,
      "free",
      "Failed to free table"
    );

  useEffect(() => {
    fetchTables();
    const interval = setInterval(fetchTables, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    tables,
    loading,
    error,
    updateTableStatus,
    occupyTable,
    freeTable,
    openAllTables,
  };
};
