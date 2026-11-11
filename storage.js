/* =====================================================
   YPEDIA — STORAGE.JS
   Local Storage + IndexedDB + Backup System
===================================================== */

const YpediaStorage = (() => {
  "use strict";

  const DB_NAME = "YpediaDB";
  const DB_VERSION = 1;
  const STORE_NAME = "files";
  let database = null;

  // LOCAL STORAGE
  function saveData(key, data) {
    try {
      localStorage.setItem(`ypedia_${key}`, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error("YPEDIA: Gagal menyimpan data:", error);
      return false;
    }
  }

  function getData(key, fallback = []) {
    try {
      const saved = localStorage.getItem(`ypedia_${key}`);
      return saved === null ? fallback : JSON.parse(saved);
    } catch (error) {
      console.error("YPEDIA: Gagal membaca data:", error);
      return fallback;
    }
  }

  function removeData(key) {
    try {
      localStorage.removeItem(`ypedia_${key}`);
      return true;
    } catch (error) {
      console.error("YPEDIA: Gagal menghapus data:", error);
      return false;
    }
  }

  // INDEXEDDB
  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (database) {
        resolve(database);
        return;
      }

      if (!("indexedDB" in window)) {
        reject(new Error("Browser tidak mendukung IndexedDB."));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = event => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };

      request.onsuccess = event => {
        database = event.target.result;
        database.onversionchange = () => {
          database.close();
          database = null;
        };
        resolve(database);
      };

      request.onerror = () => {
        reject(request.error || new Error("Database gagal dibuka."));
      };

      request.onblocked = () => {
        console.warn("YPEDIA: Database tertunda karena tab lain.");
      };
    });
  }

  // SAVE FILE
  async function saveFile(id, file, category = "file") {
    try {
      if (!id || !file) throw new Error("ID atau file tidak tersedia.");

      const db = await openDatabase();

      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        store.put({
          id: String(id),
          file,
          category,
          name: file.name || "File tanpa nama",
          type: file.type || "application/octet-stream",
          size: file.size || 0,
          updatedAt: new Date().toISOString()
        });

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    } catch (error) {
      console.error("YPEDIA: Gagal menyimpan file:", error);
      return false;
    }
  }

  // GET FILE
  async function getFile(id) {
    try {
      const db = await openDatabase();

      return await new Promise((resolve, reject) => {
        const request = db.transaction(STORE_NAME, "readonly")
          .objectStore(STORE_NAME)
          .get(String(id));

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("YPEDIA: Gagal mengambil file:", error);
      return null;
    }
  }

  // GET ALL FILES
  async function getAllFiles(category = null) {
    try {
      const db = await openDatabase();

      const files = await new Promise((resolve, reject) => {
        const request = db.transaction(STORE_NAME, "readonly")
          .objectStore(STORE_NAME)
          .getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });

      return category === null
        ? files
        : files.filter(item => item.category === category);
    } catch (error) {
      console.error("YPEDIA: Gagal membaca file:", error);
      return [];
    }
  }

  // DELETE FILE
  async function deleteFile(id) {
    try {
      const db = await openDatabase();

      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).delete(String(id));

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    } catch (error) {
      console.error("YPEDIA: Gagal menghapus file:", error);
      return false;
    }
  }

  // CLEAR FILES
  async function clearFiles() {
    try {
      const db = await openDatabase();

      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).clear();

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    } catch (error) {
      console.error("YPEDIA: Gagal membersihkan file:", error);
      return false;
    }
  }

  // FILE TO DATA URL
  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  // DATA URL TO FILE
  async function dataURLToFile(dataURL, name, type) {
    const response = await fetch(dataURL);
    if (!response.ok) throw new Error("Data file backup tidak valid.");

    const blob = await response.blob();

    return new File([blob], name || "backup-file", {
      type: type || blob.type || "application/octet-stream"
    });
  }

  // EXPORT BACKUP — MENGEMBALIKAN BLOB
  async function exportBackup() {
    try {
      const keys = [
        "summaries", "schedules", "memories", "journals",
        "favorites", "progress", "profile", "settings"
      ];

      const backup = {
        app: "YPEDIA",
        version: 1,
        exportedAt: new Date().toISOString(),
        data: {},
        files: []
      };

      keys.forEach(key => {
        backup.data[key] = getData(key, null);
      });

      const storedFiles = await getAllFiles();

      for (const item of storedFiles) {
        backup.files.push({
          id: item.id,
          category: item.category,
          name: item.name,
          type: item.type,
          size: item.size,
          updatedAt: item.updatedAt,
          dataURL: await fileToDataURL(item.file)
        });
      }

      return new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: "application/json" }
      );
    } catch (error) {
      console.error("YPEDIA: Backup gagal:", error);
      return null;
    }
  }

  // IMPORT BACKUP
  async function importBackup(file) {
    try {
      if (!file) throw new Error("File backup belum dipilih.");

      const backup = JSON.parse(await file.text());

      if (
        !backup ||
        backup.app !== "YPEDIA" ||
        backup.version !== 1 ||
        !backup.data ||
        typeof backup.data !== "object" ||
        Array.isArray(backup.data)
      ) {
        throw new Error("Format backup YPEDIA tidak valid.");
      }

      const keys = [
        "summaries", "schedules", "memories", "journals",
        "favorites", "progress", "profile", "settings"
      ];

      for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(backup.data, key)) {
          if (!saveData(key, backup.data[key])) {
            throw new Error(`Gagal memulihkan data ${key}.`);
          }
        }
      }

      if (Array.isArray(backup.files)) {
        for (const item of backup.files) {
          if (!item.id || !item.dataURL) continue;

          const restoredFile = await dataURLToFile(
            item.dataURL,
            item.name,
            item.type
          );

          const saved = await saveFile(
            item.id,
            restoredFile,
            item.category || "file"
          );

          if (!saved) {
            throw new Error(`Gagal memulihkan file ${item.name || item.id}.`);
          }
        }
      }

      return true;
    } catch (error) {
      console.error("YPEDIA: Import backup gagal:", error);
      return false;
    }
  }

  // FILE URL
  async function getFileURL(id) {
    const result = await getFile(id);
    if (!result || !result.file) return null;
    return URL.createObjectURL(result.file);
  }

  return {
    saveData,
    getData,
    removeData,
    openDatabase,
    saveFile,
    getFile,
    getAllFiles,
    deleteFile,
    clearFiles,
    getFileURL,
    exportBackup,
    importBackup
  };
})();

window.YpediaStorage = YpediaStorage;