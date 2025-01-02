import db from "../../../models/index.js";
import { Op, Sequelize } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import { connectedAgents, pendingTasks } from "../../server.js";



const {
  UserCourse,
  Course,
  Assignment,
  Submission,
  Exam,
  User,
  Question,
  TestCase,
} = db;

export const getSubmissionByStudent = async (req, res) => {
  try {
    const studentID = req.user.id;

    const submissions = await Submission.findAll({
        where: {
          UserID: studentID,
        },
        include: [
          {
            model: Question,
            attributes: [['Name', 'question_name']], 
            where: { DeletedAt: null }, 
          },
        ],
      });


    res.status(200).json({
      submissions: submissions,
    });
  } catch (error) {
    console.error("Error fetching submission :", error);
    res.status(500).json({ error: "Failed to fetch submission" });
  }
};



const languageResources = {
  python: { cpu: 0.3, memory: 128 },
  java: { cpu: 0.5, memory: 512 },
  javascript: { cpu: 0.5, memory: 256 },
};

export function getAllVMStats() {
  return Array.from(connectedAgents.entries()).map(([agentId, stats]) => ({
    agentId,
    ...stats,
  }));
}

export function updateVMStats(vmId, updatedStats) {
  if (connectedAgents.has(vmId)) {
    const currentStats = connectedAgents.get(vmId);
    connectedAgents.set(vmId, { ...currentStats, ...updatedStats });
    // console.log(`Updated stats for VM ${vmId}:`, connectedAgents.get(vmId));
  } else {
    console.error(`VM with ID ${vmId} not found.`);
  }
}

export function selectBestVM(requiredCpu, requiredMemory) {
  const vmStats = getAllVMStats();
  let bestVM = null;
  let bestScore = 0;

  for (const vm of vmStats) {
    const availableCpu = vm.total_cpu - vm.cpu_usage;
    const availableMemory = vm.total_memory - vm.memory_usage;

    if (availableCpu < requiredCpu || availableMemory < requiredMemory) {
      continue;
    }

    const score = availableCpu * 0.7 + availableMemory * 0.3;

    if (score > bestScore) {
      bestScore = score;
      bestVM = vm;
    }
  }

  return bestVM;
}
export async function waitAndRetrySelectBestVM(
  requiredCpu,
  requiredMemory,
  maxRetries = 36,
  delayMs = 5000
) {
  let attempt = 0;
  while (attempt < maxRetries) {
    console.log(`Attempt ${attempt + 1}: Looking for the best VM...`);
    const bestVM = await selectBestVM(requiredCpu, requiredMemory);

    if (bestVM) {
      return bestVM;
    }

    console.log(`No VM found. Retrying in ${delayMs / 1000} seconds...`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    attempt++;
  }

  console.error("Max retries reached. No VM available.");
  return null;
}

export async function submitCode(req, res) {
  try {
    console.log("recording metrics before tasking");
    console.log(connectedAgents);
    const { questionID, language, code } = req.body;
    const studentID = req.user.id;
    const submissionCount = await Submission.count({
      where: { UserID: studentID, QuestionID: questionID },
    });
    // console.log(submissionCount);
    const question = await Question.findOne({
      where: { ID: questionID, DeletedAt: null },
      attributes: ["SubmissionLimit"],
    });
    // console.log(question.SubmissionLimit);

    if (question && submissionCount >= question.SubmissionLimit) {
      return res.status(403).json({ error: "Submission limit reached." });
    }

    function parseInputOrOutput(value) {
      if (!value) return []; 

      const str = String(value).trim();

      try {
        return JSON.parse(str);
      } catch (error) {
        console.error(`Failed to parse value as JSON: ${str}`);
        return [];
      }
    }

    const testCases = await TestCase.findAll({
      where: { QuestionID: questionID, DeletedAt: null },
      order: [["Sequence", "ASC"]],
    });
    // const formattedTestCases = testCases.map((testCase) => ({
    //   input: testCase.Input, // Assuming 'Input' is an array
    //   expected: testCase.Output, // Assuming 'Output' is an array
    // }));
    const formattedTestCases = testCases.map((testCase) => ({
      input: parseInputOrOutput(testCase.Input),
      expected: parseInputOrOutput(testCase.Output),
    }));

    const taskId = uuidv4();
    const task = {
      id: taskId,
      language: language,
      code: code,
      testCases: formattedTestCases,
    };
    const newSubmission = await Submission.create({
      Score: 0 || null,
      TimeSpend: null || null,
      MemoryUsage: null,
      Code: code,
      Language: language,
      UserID: studentID,
      QuestionID: questionID,
    });

    const allocatedResource = languageResources[language];
    if (!allocatedResource) {
      return res.status(400).json({ message: "Unsupported language" });
    }

    const bestVM = await waitAndRetrySelectBestVM(
      allocatedResource.cpu,
      allocatedResource.memory
    );
    if (!bestVM) {
      return res.status(503).json({ message: "No worker available Current Server is too busy, please send it later" });
    }

    const agentId = bestVM.agentId; 
    const fullVMDetails = connectedAgents.get(agentId);
    const agentWs = fullVMDetails.endpoint;

    // VM checkpoint
    if (!agentWs) {
      return res.status(503).json({ message: "Selected VM is not connected" });
    }

    // await updateVMStats(agentId, {
    //   cpu_usage: parseFloat(fullVMDetails.cpu_usage) + allocatedResource.cpu,
    //   memory_usage:
    //     parseFloat(fullVMDetails.memory_usage) + allocatedResource.memory,
    //   num_runners: parseInt(fullVMDetails.num_runners) + 1,
    // });

    const agentPromise = new Promise((resolve, reject) => {
      pendingTasks.set(taskId, { resolve, reject });

      // Optional timeout: if agent doesn't respond in X seconds, reject
      // setTimeout(() => {
      //   if (pendingTasks.has(taskId)) {
      //     pendingTasks.delete(taskId);
      //     reject(new Error("Agent timed out"));
      //   }
      // }, 30000);
    });

    // 7) Send the request to the agent
    agentWs.send(
      JSON.stringify({
        type: "task",
        task: task,
      }),
      (err) => {
        if (err) {
          pendingTasks.delete(taskId);
          // updateVMStats(agentId, {
          //   cpu_usage: parseFloat(fullVMDetails.cpu_usage),
          //   memory_usage: parseFloat(fullVMDetails.memory_usage),
          //   num_runners: parseInt(fullVMDetails.num_runners),
          // });
          return res
            .status(500)
            .json({ message: "Failed to send task to agent" });
        }
      }
    );
    

    // 8) Await the agent's response
    try {
      const response = await agentPromise;
      let resourcesReverted = false;
      console.log("recording metrics in tasking");
      console.log(connectedAgents);
      

      // const currentStats = connectedAgents.get(agentId);
      // const revertResources = async () => {
      //   if (!resourcesReverted) {
      //     // await updateVMStats(agentId, {
      //     //   cpu_usage:
      //     //     parseFloat(currentStats.cpu_usage) - allocatedResource.cpu,
      //     //   memory_usage:
      //     //     parseFloat(currentStats.memory_usage) - allocatedResource.memory,
      //     //   num_runners: parseInt(currentStats.num_runners) - 1,
      //     // });
      //     // resourcesReverted = true;
      //   }
      // };

      if (!response.success) {
        const errorDetails = response.data.match(/code (\d+)/);
        const lineNumber = errorDetails ? parseInt(errorDetails[1], 10) : 0;
        const errorRes = {
          error: {
            code: "EXECUTION_ERROR",
            message: "程式執行錯誤",
            details: {
              line: lineNumber,
              error_message: response.data || "runtime error",
            },
          },
        };
        console.log("recording metrics after tasking");
        console.log(connectedAgents);
        
        return res.status(202).json({ status: "error", errorRes });
      }
      const result = response.data.result;
      const metrics = response.data.metrics;

      const transformedTestCases = result.cases.map((testCase) => {
        return {
          case_id: testCase.id,
          status: testCase.status,
          execution_time: Math.round(testCase.time * 1000),

          input: JSON.stringify(testCase.input),
          expected_output: JSON.stringify(testCase.expected),
          actual_output: JSON.stringify(testCase.actual),
        };
      });

      const score = Math.round((result.passed / result.total) * 100);

      const output = {
        test_cases: transformedTestCases,
        total_test_cases: result.total,
        passed_test_cases: result.passed,
        score: score,
        cpu_usage: metrics.resources.cpu.used,
        memory_usage: metrics.resources.memory.used,

        execution_time: Math.round(result.execution_time * 1000),
      };

      await newSubmission.update({
        Score: score,
        TimeSpend: output.execution_time,
        MemoryUsage: output.memory_usage,
      });


      console.log("recording metrics after tasking");
      console.log(connectedAgents);

      return res.json({ status: "success", output });
    } catch (error) {
      console.error("Agent error:", error);

      // Revert usage stats
      // if (!resourcesReverted) {
      

      return res.status(500).json({
        status: "error",
        message: "Error processing request: " + error.message,
      });
    }
  } catch (error) {
    console.error("Error handling request:", error);
    return res.status(400).json({ error: error.message });
  }
}
