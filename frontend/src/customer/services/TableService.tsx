const API_BASE_URL = "http://127.0.0.1:5000/api";

export interface Table {
  id: number;
  table_number: number;
  status: "free" | "occupied";
  capacity: number;
}

export const TableService = {
  async getTables(): Promise<Table[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/tables`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching tables:", error);
      throw new Error("Failed to fetch tables");
    }
  },

  async updateTableStatus(tableId: number, status: string): Promise<void> {
    try {
      if (status !== "free" && status !== "occupied") {
        throw new Error('Invalid status. Use "free" or "occupied" only.');
      }

      const response = await fetch(`${API_BASE_URL}/tables/${tableId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update table status");
      }
    } catch (error) {
      console.error("Error updating table status:", error);
      throw error;
    }
  },

  async occupyTable(tableId: number): Promise<void> {
    return this.updateTableStatus(tableId, "occupied");
  },

  async freeTable(tableId: number): Promise<void> {
    return this.updateTableStatus(tableId, "free");
  },

  async openAllTables(): Promise<void> {
    try {
      const token = localStorage.getItem("token");

      const tablesResponse = await fetch("/api/tables", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!tablesResponse.ok) {
        throw new Error("Failed to fetch tables");
      }

      const tables = await tablesResponse.json();

      const updatePromises = tables.map((table: any) =>
        fetch(`/api/tables/${table.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "free" }),
        })
      );

      await Promise.all(updatePromises);
    } catch (error) {
      console.error("Error opening all tables:", error);
      throw error;
    }
  },
};
