import { useEffect, useState } from "react";
import api from "../api/axios";

export const useCategories = () => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api
      .get("/categories")
      .then(({ data }) => setCategories(data.data))
      .catch(() => setCategories([]));
  }, []);

  return categories;
};
