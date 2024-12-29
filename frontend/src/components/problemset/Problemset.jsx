import axios from "axios";

import React, { useEffect, useLayoutEffect, useState } from "react";
import { BeatLoader } from "react-spinners";
import { ToastContainer, toast } from "react-toastify";
import { BACK_SERVER_URL } from "../../config/config";
import Paper from "@mui/material/Paper";
import "react-toastify/dist/ReactToastify.css";
import "./problemset.css";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Chip from "@mui/material/Chip";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getDateTime } from "../../utils";
const columns = [
  { id: "id", label: "#", minWidth: 10 },
  { id: "name", label: "Problem Name", minWidth: 200 },
  { id: "difficulty", label: "Difficulty", minWidth: 50 },
  { id: "score", label: "Score", minWidth: 100 },
];

const styles = {
  assignmentTitle: {
    marginBottom: "1rem",
    fontSize: "1.5rem",
    fontWeight: "bold",
  },
  problemsetInfo: {
    display: "flex",
    flexDirection: "column",
    marginTop: "1rem",
    marginBottom: "1rem",
  },
  infoLabel: {
    display: "block",
    marginBottom: "0.2rem",
  },
};
export default function ProblemSet() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [allProblems, setAllProblems] = useState([]);
  const [rows, setRows] = useState([]);
  const [loader, setLoader] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { id } = useParams();
  const location = useLocation();
  const problemsetInfo = location.state?.problemsetInfo;
  const navigate = useNavigate();

  useLayoutEffect(() => {
    axios
      .get(
        `${BACK_SERVER_URL}/api/student/${problemsetInfo.problemType}/questions/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access-token")}`,
          },
        }
      )
      .then((res) => {
        let problems = res.data.questions;

        setAllProblems(problems);
        setRows(problems);
        setLoader(false);
      })
      .catch((err) => {
        const error = err.response ? err.response.data.message : err.message;
        toast.error(error, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        });
      });
  }, [id]);

  useEffect(() => {
    const getPageData = () => {
      let filtered = allProblems;
      if (searchQuery) {
        filtered = allProblems.filter((p) =>
          p.name.toLowerCase().startsWith(searchQuery.toLowerCase())
        );
        setRows(filtered);
      } else {
        setRows(filtered);
      }
    };
    getPageData();

    // eslint-disable-next-line
  }, [searchQuery, allProblems]);

  const handleChangePage = (e, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(e.target.value);
    setPage(0);
  };

  const handleRowClick = (problemId, problemsetInfo) => {
    navigate(`/problemset/${problemId}`, {
      state: { problemsetInfo }, // 傳遞額外資訊
    });
  };

  return (
    <div className="courses-container">
      <ToastContainer />
      <div className="courses-right">
        <h2 style={styles.assignmentTitle}>
          {problemsetInfo.courseInfo.semester} {problemsetInfo.courseInfo.name}
        </h2>
        <h2 style={styles.assignmentTitle}>{problemsetInfo.problemsetName}</h2>

        <div style={styles.problemsetInfo}>
          <div style={styles.infoLabel}>
            <span>
              Start Date:{" "}
              {problemsetInfo.startDate
                ? getDateTime(problemsetInfo.startDate)
                : problemsetInfo.startDate}
            </span>
          </div>

          <span style={styles.infoLabel}>
            Due Date: {getDateTime(problemsetInfo.dueDate)}
          </span>
        </div>

        <Paper
          sx={{
            width: "100%",
            height: "800px",
            borderRadius: "16px",
            overflow: "hidden",
            marginBottom: "40px",
            marginTop: "20px",
          }}
        >
          <TableContainer>
          {loader && (
    <div className="loader-container">
      <BeatLoader color={"#343a40"} size={30} loading={loader} />
    </div>
  )}
            <Table stickyHeader aria-label="sticky table">
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      align={column.align}
                      style={{
                        minWidth: column.minWidth,
                        maxWidth: column.maxWidth,
                        fontWeight: "bold",
                        fontSize: "16px",
                        backgroundColor: "#FFF9D0",
                      }}
                    >
                      {column.label}
                      
                    </TableCell>
                    
                  ))}
                  
                </TableRow>
              </TableHead>
              <TableBody>

                {rows
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row, index) => {
                    return (
                      <TableRow
                        hover
                        role="checkbox"
                        tabIndex={-1}
                        key={index}
                        style={{ cursor: "pointer" }}
                      >
                        {columns.map((column) => {
                          const value =
                            column.id === "id"
                              ? page * rowsPerPage + index + 1
                              : row[column.id];

                          if (column.id === "score") {
                            return (
                              <TableCell key={column.id} align={column.align}>
                                <span
                                  style={{
                                    fontWeight: "regular",
                                    fontSize: "16px",
                                    color: "#222222",
                                  }}
                                >
                                  {value} / 100
                                </span>
                              </TableCell>
                            );
                          } else if (column.id === "difficulty") {
                            let badgeColor;
                            switch (value) {
                              case "Easy":
                                badgeColor = "#8ACB88";
                                break;
                              case "Hard":
                                badgeColor = "#FA7272";
                                break;
                              case "Medium":
                                badgeColor = "#5AB2FF";
                                break;
                              default:
                                badgeColor = "#D9D9D9";
                            }

                            return (
                              <TableCell key={column.id} align={column.align}>
                                <Chip
                                  label={value}
                                  style={{
                                    fontWeight: "bold",
                                    color: "white",
                                    backgroundColor: badgeColor,
                                    textTransform: "capitalize",
                                  }}
                                />
                              </TableCell>
                            );
                          } else {
                            return (
                              <TableCell key={column.id} align={column.align}>
                                <span
                                  style={{
                                    fontWeight: "regular",
                                    fontSize: "16px",
                                    color: "#222222",
                                  }}
                                >
                                  {value}
                                </span>
                              </TableCell>
                            );
                          }
                        })}
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 100]}
            component="div"
            count={rows.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      </div>
    </div>
  );
}
