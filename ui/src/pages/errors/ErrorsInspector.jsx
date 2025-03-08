import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import _ from 'lodash';
// Import ResultsTable component
import ResultsTable from '../executions/ResultsTable';
// Import workflow search hook
import { useWorkflowSearch } from '../../data/workflow';
// Import workflow definitions
import { useWorkflowDefs } from '../../data/workflow';
// Import Material UI components for the workflow selector
import { Checkbox, MenuItem, ListItemText, IconButton, Menu, Tooltip as MUITooltip } from '@material-ui/core';
import ViewColumnIcon from '@material-ui/icons/ViewColumn';
import AccessTimeIcon from '@material-ui/icons/AccessTime';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import PauseIcon from '@material-ui/icons/Pause';

const colors = {
  gray14: '#eeeeee',
  blue: '#1f83db',
  green: '#41b957',
  yellow: '#ffc658',
  red: '#e50914',
  purple: '#8a2be2',
  teal: '#00ced1',
};

const useStyles = {
  wrapper: {
    height: "100%",
    overflow: "hidden",
    display: "flex",
    flexDirection: "row",
    position: "relative",
  },
  name: {
    width: "50%",
  },
  submitButton: {
    float: "right",
    backgroundColor: colors.blue,
    color: "white",
    padding: "8px 16px",
    borderRadius: "4px",
    border: "none",
    cursor: "pointer",
  },
  toolbar: {
    backgroundColor: colors.gray14,
    padding: "10px",
    borderRadius: "4px",
    marginBottom: "15px",
  },
  workflowName: {
    fontWeight: "bold",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "20px",
    overflowY: "auto",
    height: "100%",
    maxHeight: "100vh"
  },
  row: {
    display: "flex",
    flexDirection: "row",
    marginBottom: "20px",
    gap: "20px",
  },
  fields: {
    margin: "30px 0",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  runInfo: {
    marginLeft: "-350px",
  },
  card: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "6px",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
  },
  chartContainer: {
    height: "300px",
    width: "100%",
  },
  title: {
    fontSize: "20px",
    fontWeight: "bold",
    marginBottom: "15px",
  },
  subtitle: {
    fontSize: "16px",
    fontWeight: "bold",
    marginBottom: "10px",
  },
  gridContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(48%, 1fr))",
    gap: "20px",
    width: "100%",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  tableHeader: {
    backgroundColor: colors.gray14,
    padding: "10px",
    textAlign: "left",
    borderBottom: "1px solid #ddd",
  },
  tableCell: {
    padding: "10px",
    borderBottom: "1px solid #ddd",
  },
  textArea: {
    width: "100%",
    height: "120px",
    padding: "10px",
    borderRadius: "4px",
    border: "1px solid #ddd",
  },
  statusTag: {
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "bold",
  },
  statusCompleted: {
    backgroundColor: "#e6f7e6",
    color: "#2e7d32",
  },
  statusFailed: {
    backgroundColor: "#ffebee",
    color: colors.red,
  },
  statusTerminated: {
    backgroundColor: "#f3e5f5",
    color: colors.purple,
  },
  statusInProgress: {
    backgroundColor: "#e3f2fd",
    color: colors.blue,
  },
  select: {
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ddd",
    width: "100%",
  },
  filterContainer: {
    display: "flex",
    gap: "20px",
    marginBottom: "20px",
  },
  filterItem: {
    flex: 1,
  },
  summaryCardContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(22%, 1fr))",
    gap: "15px",
    marginBottom: "20px",
  },
};

const CHART_COLORS = [
  '#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', 
  '#d0ed57', '#ffc658', '#ff8042', '#ff6361', '#bc5090',
  '#58508d', '#003f5c', '#7a5195', '#ef5675', '#ffa600'
];

// Replace the String prototype extension with a standalone function
const getHashCode = (str) => {
  let hash = 0;
  if (!str || str.length === 0) return hash;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
};

// Add a function to get color for status in the pie chart
const getStatusColor = (status) => {
  if (status === 'FAILED') return colors.red;
  if (status === 'TERMINATED') return colors.purple;
  if (status === 'COMPLETED') return colors.green;
  if (status === 'RUNNING') return colors.blue;
  return CHART_COLORS[Math.abs(getHashCode(status) || status.length) % CHART_COLORS.length];
};

// Define time range options - removed the 'All Time' option
const TIME_RANGE_OPTIONS = [
  { label: '5 Minutes', value: '5m', milliseconds: 5 * 60 * 1000 },
  { label: '30 Minutes', value: '30m', milliseconds: 30 * 60 * 1000 },
  { label: '60 Minutes', value: '60m', milliseconds: 60 * 60 * 1000 },
  { label: '3 Hours', value: '3h', milliseconds: 3 * 60 * 60 * 1000 },
  { label: '6 Hours', value: '6h', milliseconds: 6 * 60 * 60 * 1000 },
  { label: '12 Hours', value: '12h', milliseconds: 12 * 60 * 60 * 1000 },
  { label: '24 Hours', value: '24h', milliseconds: 24 * 60 * 60 * 1000 },
  { label: '3 Days', value: '3d', milliseconds: 3 * 24 * 60 * 60 * 1000 },
  { label: '7 Days', value: '7d', milliseconds: 7 * 24 * 60 * 60 * 1000 },
  { label: '1 Month', value: '1M', milliseconds: 30 * 24 * 60 * 60 * 1000 },
  { label: '3 Months', value: '3M', milliseconds: 90 * 24 * 60 * 60 * 1000 }
];


const ErrorsInspector = () => {
  const [data, setData] = useState(null);
  const [filteredData, setFilteredData] = useState(null);
  const [workflowTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [selectedWorkflowDefs, setSelectedWorkflowDefs] = useState([]);
  const [sortField, setSortField] = useState("startTime");
  const [sortDirection, setSortDirection] = useState("desc");
  const [statusFilterFromChart, setStatusFilterFromChart] = useState(false);
  const [selectedWorkflowType, setSelectedWorkflowType] = useState(null);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(60);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [notification, setNotification] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h'); // Default to 24 hours
  // Add new state for reason for incompletion filter
  const [selectedReasonForIncompletion, setSelectedReasonForIncompletion] = useState(null);
  const [reasonFilterFromChart, setReasonFilterFromChart] = useState(false);
  
  // Reference to store the interval ID for cleanup
  const refreshIntervalRef = useRef(null);

  // Fetch workflow definitions
  const { defs: workflowDefs, error: workflowDefsError } = useWorkflowDefs();
  
  // Fallback for workflow definitions if the hook isn't working
  const [fallbackDefs, setFallbackDefs] = useState([]);

  // Define calculateMetrics function before it's used in useEffect
  const calculateMetrics = useCallback((workflows) => {
    if (!workflows || workflows.length === 0) {
      return {
        workflowTypes: {},
        statusCounts: {},
        executionTimeByType: {},
        correlationIds: {},
        patientIds: {},
        totalExecutionTime: 0,
        totalWorkflows: 0,
        completedWorkflows: 0,
        failedWorkflows: 0,
        runningWorkflows: 0,
        terminatedWorkflows: 0,
        timedOutWorkflows: 0,
        reasonsForIncompletion: {},
        avgExecutionTime: 0
      };
    }

    const metrics = {
      workflowTypes: {},
      statusCounts: {},
      executionTimeByType: {},
      correlationIds: {},
      reasonsForIncompletion: {},
      totalExecutionTime: 0,
      totalWorkflows: workflows.length,
      completedWorkflows: 0,
      failedWorkflows: 0,
      runningWorkflows: 0,
      terminatedWorkflows: 0,
      timedOutWorkflows: 0,
      avgExecutionTime: 0
    };
    
    workflows.forEach(workflow => {
      // Count by workflow type
      metrics.workflowTypes[workflow.workflowType] = 
        (metrics.workflowTypes[workflow.workflowType] || 0) + 1;
      
      // Count by status
      metrics.statusCounts[workflow.status] = 
        (metrics.statusCounts[workflow.status] || 0) + 1;
      
      // Track completed vs failed vs running vs terminated vs timed out
      if (workflow.status === "COMPLETED") {
        metrics.completedWorkflows++;
      } else if (workflow.status === "FAILED") {
        metrics.failedWorkflows++;
      } else if (workflow.status === "RUNNING") {
        metrics.runningWorkflows++;
      } else if (workflow.status === "TERMINATED") {
        metrics.terminatedWorkflows++;
      } else if (workflow.status === "TIMED_OUT") {
        metrics.timedOutWorkflows++;
      }
      
      // Track reasons for incompletion
      if (workflow.reasonForIncompletion) {
        metrics.reasonsForIncompletion[workflow.reasonForIncompletion] = 
          (metrics.reasonsForIncompletion[workflow.reasonForIncompletion] || 0) + 1;
      }
      
      // Sum execution times by type
      if (!metrics.executionTimeByType[workflow.workflowType]) {
        metrics.executionTimeByType[workflow.workflowType] = {
          count: 0,
          totalTime: 0,
          avgTime: 0,
          minTime: Infinity,
          maxTime: 0
        };
      }
      
      const typeStats = metrics.executionTimeByType[workflow.workflowType];
      typeStats.count++;
      typeStats.totalTime += workflow.executionTime;
      typeStats.minTime = Math.min(typeStats.minTime, workflow.executionTime);
      typeStats.maxTime = Math.max(typeStats.maxTime, workflow.executionTime);
      typeStats.avgTime = typeStats.totalTime / typeStats.count;
      
      // Track total execution time
      metrics.totalExecutionTime += workflow.executionTime;
      
      // Count by correlation ID
      if (workflow.correlationId) {
        metrics.correlationIds[workflow.correlationId] = 
          (metrics.correlationIds[workflow.correlationId] || 0) + 1;
      }
    });
    
    // Calculate average execution time
    metrics.avgExecutionTime = metrics.totalExecutionTime / metrics.totalWorkflows;
    
    return metrics;
  }, []);

  useEffect(() => {
    // If workflowDefs is not an array or is empty, try to fetch directly
    if (!Array.isArray(workflowDefs) || workflowDefs.length === 0) {
      console.log("Fetching workflow definitions directly as fallback");
      
      fetch('/api/metadata/workflow')
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          console.log("Fallback workflow definitions:", data);
          if (Array.isArray(data)) {
            setFallbackDefs(data);
          }
        })
        .catch(error => {
          console.error("Error fetching fallback workflow definitions:", error);
        });
    }
  }, [workflowDefs]);
  
  // Use fallback definitions if the hook didn't provide valid data
  const effectiveWorkflowDefs = Array.isArray(workflowDefs) && workflowDefs.length > 0 
    ? workflowDefs 
    : fallbackDefs;

  // Debug workflow definitions
  useEffect(() => {
    console.log("Workflow definitions:", workflowDefs);
  }, [workflowDefs]);

  // Create a unique list of workflow definition names from effectiveWorkflowDefs
  const uniqueWorkflowDefs = useMemo(() => {
    if (!Array.isArray(effectiveWorkflowDefs)) return [];
    
    // Use a Set to get unique workflow names
    const uniqueNames = new Set();
    const uniqueDefs = [];
    
    effectiveWorkflowDefs.forEach(def => {
      if (!uniqueNames.has(def.name)) {
        uniqueNames.add(def.name);
        uniqueDefs.push(def);
      }
    });
    
    return uniqueDefs;
  }, [effectiveWorkflowDefs]);

  // Initialize selectedWorkflowDefs with all unique workflow definitions when they load
  useEffect(() => {
    if (uniqueWorkflowDefs.length > 0 && selectedWorkflowDefs.length === 0) {
      console.log("Setting initial workflow defs:", uniqueWorkflowDefs);
      setSelectedWorkflowDefs(uniqueWorkflowDefs.map(def => def.name));
    }
  }, [uniqueWorkflowDefs, selectedWorkflowDefs.length]);

  // Handle workflow definitions fetch error
  useEffect(() => {
    if (workflowDefsError) {
      console.error('Error fetching workflow definitions:', workflowDefsError);
      setNotification({
        message: "Failed to load workflow definitions. Some filtering options may be unavailable.",
        type: "error",
        timestamp: new Date()
      });
      
      // Clear notification after 5 seconds
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [workflowDefsError]);

  // Function to build the query string based on selected time range and workflow types
  const buildQueryString = useCallback(() => {
    let queryParts = [];
    
    // Always add time range filter since 'all' option is removed
    const selectedOption = TIME_RANGE_OPTIONS.find(option => option.value === selectedTimeRange);
    if (selectedOption && selectedOption.milliseconds) {
      const cutoffTime = new Date(Date.now() - selectedOption.milliseconds).getTime();
      queryParts.push(`startTime>${cutoffTime}`);
    }
    
    // Add workflow type filter if not all workflow types are selected
    if (uniqueWorkflowDefs.length > 0 && selectedWorkflowDefs.length > 0 && 
        selectedWorkflowDefs.length !== uniqueWorkflowDefs.length) {
      
      // For multiple workflow types, use the IN operator
      if (selectedWorkflowDefs.length === 1) {
        // For a single workflow type, use a simple condition
        queryParts.push(`workflowType="${selectedWorkflowDefs[0]}"`);
      } else {
        // For multiple workflow types, use the IN operator with comma-separated values
        queryParts.push(`workflowType IN (${selectedWorkflowDefs.join(',')})`);
      }
    }
    
    // Add status filter for errored workflows (FAILED, TERMINATED, TIMED_OUT)
    queryParts.push(`status IN (FAILED,TERMINATED,TIMED_OUT)`);
    
    // Log the query for debugging
    const finalQuery = queryParts.join(' AND ');
    console.log("Query string:", finalQuery);
    
    return finalQuery;
  }, [selectedTimeRange, selectedWorkflowDefs, uniqueWorkflowDefs]);

  // Create a search object with the time range query
  const searchObj = useMemo(() => ({
    rowsPerPage,
    page: currentPage,
    sort: `${sortField}:${sortDirection.toUpperCase()}`,
    freeText: "",
    query: buildQueryString(),
    refreshTrigger
  }), [rowsPerPage, currentPage, sortField, sortDirection, buildQueryString, refreshTrigger]);
  
  // Call the workflow search hook
  const { data: workflowData, error: searchError } = useWorkflowSearch(searchObj);

  // Process API data
  useEffect(() => {
    if (workflowData) {
      // Use API data
      setData(workflowData);
      setFilteredData(workflowData.results || []);
      setIsLoading(false);
      
      // Calculate metrics immediately when data is received
      if (workflowData.results && workflowData.results.length > 0) {
        setMetrics(calculateMetrics(workflowData.results));
        
      } else {
        // No results found
        console.log(`No data found with time range: ${selectedTimeRange}`);
        // Set empty metrics for no data
        setMetrics(calculateMetrics([]));
      }
    } else if (searchError) {
      console.error('Error fetching workflow data:', searchError);
      setData({ results: [], totalHits: 0 });
      setFilteredData([]);
      setIsLoading(false);
      setMetrics(calculateMetrics([]));
    }
  }, [workflowData, searchError, selectedTimeRange, calculateMetrics]);
  

  useEffect(() => {
    if (!data || !data.results) return;

    // Apply filters
    let results = [...data.results];
    
    if (workflowTypeFilter !== "all") {
      results = results.filter(workflow => workflow.workflowType === workflowTypeFilter);
    }
    
    if (statusFilter !== "all") {
      results = results.filter(workflow => workflow.status === statusFilter);
    }
    
    // We no longer need to filter by selected workflow definitions here
    // since we're now handling this at the query level
    
    // Apply selected workflow type filter from chart click
    if (selectedWorkflowType) {
      results = results.filter(workflow => workflow.workflowType === selectedWorkflowType);
    }
    
    // Apply selected time period filter from chart click
    if (selectedTimePeriod) {
      // Create a date range for the selected hour (±30 minutes)
      const selectedTime = new Date(selectedTimePeriod);
      const startTime = new Date(selectedTime);
      startTime.setMinutes(selectedTime.getMinutes() - 30);
      
      const endTime = new Date(selectedTime);
      endTime.setMinutes(selectedTime.getMinutes() + 30);
      
      results = results.filter(workflow => {
        const workflowTime = new Date(workflow.startTime);
        return workflowTime >= startTime && workflowTime <= endTime;
      });
    }
    
    // Apply selected reason for incompletion filter from chart click
    if (selectedReasonForIncompletion) {
      // Define the same error patterns used in getReasonForIncompletionData
      const errorPatterns = [
        { pattern: /timeout|timed out|time exceeded/i, group: "Timeout Errors" },
        { pattern: /connection (failed|refused|reset|closed)|cannot connect|network|unreachable/i, group: "Connection Errors" },
        { pattern: /permission denied|unauthorized|access denied|forbidden/i, group: "Permission Errors" },
        { pattern: /not found|missing|404|no such/i, group: "Not Found Errors" },
        { pattern: /invalid (input|parameter|argument|value|format)|validation failed/i, group: "Validation Errors" },
        { pattern: /limit exceeded|too many|quota|throttl/i, group: "Rate Limit Errors" },
        { pattern: /database|db |sql|query|deadlock/i, group: "Database Errors" },
        { pattern: /internal (server|service) error|5[0-9][0-9]|crashed|unexpected/i, group: "Internal Service Errors" },
        { pattern: /dependency|downstream|upstream|external service/i, group: "Dependency Errors" },
        { pattern: /cancelled|canceled|aborted|terminated by user/i, group: "Cancelled by User" },
        { pattern: /configuration|config|setup|environment/i, group: "Configuration Errors" }
      ];
      
      // Check if the selected reason is one of our fuzzy groups
      const matchingPattern = errorPatterns.find(p => p.group === selectedReasonForIncompletion);
      
      if (selectedReasonForIncompletion === 'Unknown') {
        // Filter for workflows with no reason or empty reason
        results = results.filter(workflow => 
          !workflow.reasonForIncompletion || 
          workflow.reasonForIncompletion === '' || 
          workflow.reasonForIncompletion === 'null' || 
          workflow.reasonForIncompletion === 'undefined'
        );
      } else if (matchingPattern) {
        // If it's a fuzzy group, filter using the pattern
        results = results.filter(workflow => 
          workflow.reasonForIncompletion && 
          matchingPattern.pattern.test(workflow.reasonForIncompletion)
        );
      } else {
        // Otherwise, it's a specific reason (or a truncated one)
        // If it ends with '...', it's truncated, so we need to match the prefix
        if (selectedReasonForIncompletion.endsWith('...')) {
          const prefix = selectedReasonForIncompletion.slice(0, -3); // Remove the '...'
          results = results.filter(workflow => 
            workflow.reasonForIncompletion && 
            workflow.reasonForIncompletion.startsWith(prefix)
          );
        } else {
          // Exact match
          results = results.filter(workflow => 
            workflow.reasonForIncompletion === selectedReasonForIncompletion
          );
        }
      }
    }
    
    setFilteredData(results);
    
    // Calculate metrics based on filtered data
    setMetrics(calculateMetrics(results));
  }, [data, workflowTypeFilter, statusFilter, selectedWorkflowType, selectedTimePeriod, selectedReasonForIncompletion, uniqueWorkflowDefs, calculateMetrics]);

  const getWorkflowTypeData = useCallback(() => {
    if (!filteredData || filteredData.length === 0) return [];
    
    // Group by workflow type
    const groupedByType = _.groupBy(filteredData, 'workflowType');
    
    return Object.entries(groupedByType).map(([type, workflows]) => {
      const totalTime = workflows.reduce((sum, w) => sum + (w.executionTime || 0), 0);
      const avgTime = workflows.length > 0 ? totalTime / workflows.length : 0;
      
      return {
      name: type,
        count: workflows.length,
        avgTime: avgTime,
        totalTime: totalTime
      };
    });
  }, [filteredData]);

  const getStatusData = useCallback(() => {
    if (!filteredData || filteredData.length === 0) return [];
    
    // Group by status
    const groupedByStatus = _.groupBy(filteredData, 'status');
    
    return Object.entries(groupedByStatus).map(([status, workflows]) => ({
      name: status,
      value: workflows.length
    }));
  }, [filteredData]);

  // Add new function to get data grouped by reasonForIncompletion
  const getReasonForIncompletionData = useCallback(() => {
    if (!filteredData || filteredData.length === 0) return [];
    
    // Filter for workflows with a reasonForIncompletion
    const failedWorkflows = filteredData.filter(workflow => workflow.reasonForIncompletion);
    
    if (failedWorkflows.length === 0) return [];
    
    // Group by reasonForIncompletion
    const groupedByReason = _.groupBy(failedWorkflows, 'reasonForIncompletion');
    
    // For workflows without a specific reason, group them as "Unknown"
    if (groupedByReason['undefined'] || groupedByReason['null'] || groupedByReason['']) {
      const unknownReasons = [
        ...(groupedByReason['undefined'] || []),
        ...(groupedByReason['null'] || []),
        ...(groupedByReason[''] || [])
      ];
      
      if (unknownReasons.length > 0) {
        groupedByReason['Unknown'] = unknownReasons;
        delete groupedByReason['undefined'];
        delete groupedByReason['null'];
        delete groupedByReason[''];
      }
    }
    
    // Define common error patterns for fuzzy matching
    const errorPatterns = [
      { pattern: /timeout|timed out|time exceeded/i, group: "Timeout Errors" },
      { pattern: /connection (failed|refused|reset|closed)|cannot connect|network|unreachable/i, group: "Connection Errors" },
      { pattern: /permission denied|unauthorized|access denied|forbidden/i, group: "Permission Errors" },
      { pattern: /not found|missing|404|no such/i, group: "Not Found Errors" },
      { pattern: /invalid (input|parameter|argument|value|format)|validation failed/i, group: "Validation Errors" },
      { pattern: /limit exceeded|too many|quota|throttl/i, group: "Rate Limit Errors" },
      { pattern: /database|db |sql|query|deadlock/i, group: "Database Errors" },
      { pattern: /internal (server|service) error|5[0-9][0-9]|crashed|unexpected/i, group: "Internal Service Errors" },
      { pattern: /dependency|downstream|upstream|external service/i, group: "Dependency Errors" },
      { pattern: /cancelled|canceled|aborted|terminated by user/i, group: "Cancelled by User" },
      { pattern: /configuration|config|setup|environment/i, group: "Configuration Errors" }
    ];
    
    // Create a map to store the fuzzy-matched groups
    const fuzzyGroups = {};
    
    // Process each reason and apply fuzzy matching
    Object.entries(groupedByReason).forEach(([reason, workflows]) => {
      if (reason === 'Unknown') {
        fuzzyGroups['Unknown'] = workflows;
        return;
      }
      
      // Try to match the reason with one of our patterns
      let matched = false;
      for (const { pattern, group } of errorPatterns) {
        if (pattern.test(reason)) {
          if (!fuzzyGroups[group]) {
            fuzzyGroups[group] = [];
          }
          fuzzyGroups[group].push(...workflows);
          matched = true;
          break;
        }
      }
      
      // If no match was found, keep the original reason
      if (!matched) {
        // For very long reasons, truncate them for better readability
        const displayReason = reason.length > 50 ? reason.substring(0, 47) + '...' : reason;
        fuzzyGroups[displayReason] = workflows;
      }
    });
    
    // Convert the fuzzy groups to the format needed for the pie chart
    return Object.entries(fuzzyGroups).map(([reason, workflows]) => ({
      name: reason,
      value: workflows.length,
      // Store original reasons for tooltip display
      originalReasons: reason !== 'Unknown' && errorPatterns.some(p => p.group === reason) 
        ? [...new Set(workflows.map(w => w.reasonForIncompletion))]
        : [reason]
    }));
  }, [filteredData]);

  const getTimeseriesData = useCallback(() => {
    if (!filteredData || filteredData.length === 0) return [];
    
    // Group by hour
    const grouped = _.groupBy(filteredData, workflow => {
      const date = new Date(workflow.startTime);
      return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).toISOString();
    });
    
    // Convert to array and sort by time
    return Object.entries(grouped)
      .map(([timeKey, workflows]) => ({
        time: new Date(timeKey).getTime(),
        count: workflows.length
      }))
      .sort((a, b) => a.time - b.time);
  }, [filteredData]);

  // Memoize chart data calculations to prevent unnecessary recalculations
  const workflowTypeData = useMemo(() => getWorkflowTypeData(), [getWorkflowTypeData]);
  const statusData = useMemo(() => getStatusData(), [getStatusData]);
  const reasonForIncompletionData = useMemo(() => getReasonForIncompletionData(), [getReasonForIncompletionData]);
  const timeseriesData = useMemo(() => getTimeseriesData(), [getTimeseriesData]);

  // Handle workflow type bar click
  const handleWorkflowTypeClick = (data) => {
    if (data && data.name) {
      const workflowType = data.name;
      // If clicking the same type, toggle it off
      if (selectedWorkflowType === workflowType) {
        setSelectedWorkflowType(null);
      } else {
        setSelectedWorkflowType(workflowType);
        // Reset to first page when filter changes
        setCurrentPage(1);
      }
    }
  };

  // Reset workflow type filter
  const resetWorkflowTypeFilter = () => {
    setSelectedWorkflowType(null);
  };

  

  // Handle time period click
  const handleTimePeriodClick = (data) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const clickedData = data.activePayload[0].payload;
      // If clicking the same time period, toggle it off
      if (selectedTimePeriod === clickedData.time) {
        setSelectedTimePeriod(null);
      } else {
        setSelectedTimePeriod(clickedData.time);
        // Reset to first page when filter changes
        setCurrentPage(1);
      }
    }
  };

  // Reset time period filter
  const resetTimePeriodFilter = () => {
    setSelectedTimePeriod(null);
  };

  

  // Function to refresh data
  const refreshData = useCallback(() => {
    // Increment the refresh trigger to force a re-fetch
    setRefreshTrigger(prev => prev + 1);
    
    // Reset the countdown timer
    setTimeUntilRefresh(60);
    
    // Show loading indicator briefly
    setIsLoading(true);
    
    // Hide loading indicator after a short delay if it's still showing
    setTimeout(() => {
      setIsLoading(prevLoading => {
        if (prevLoading) {
          return false;
        }
        return prevLoading;
      });
    }, 500);
  }, []);
  
  // Set up auto-refresh interval
  useEffect(() => {
    // Clear any existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    
    // Only set up the interval if auto-refresh is enabled
    if (autoRefreshEnabled) {
      // Set up countdown timer that updates every second
      refreshIntervalRef.current = setInterval(() => {
        setTimeUntilRefresh(prevTime => {
          if (prevTime <= 1) {
            // Time to refresh
            refreshData();
            return 60; // Reset to 60 seconds
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    
    // Clean up interval on component unmount or when autoRefreshEnabled changes
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefreshEnabled, refreshData]);

  // Effect to handle data refresh completion
  useEffect(() => {
    if (workflowData && isLoading) {
      // Data has been refreshed
      setIsLoading(false);
      
      // Show notification
      setNotification({
        message: "Dashboard data has been refreshed",
        type: "success",
        timestamp: new Date()
      });
      
      // Clear notification after 3 seconds
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [workflowData, isLoading]);
  
  // Effect to handle search errors
  useEffect(() => {
    if (searchError) {
      // Show error notification
      setNotification({
        message: "Failed to refresh data. Will try again during next live tail update.",
        type: "error",
        timestamp: new Date()
      });
      
      // Clear notification after 5 seconds
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [searchError]);

  // Reset auto-expansion state on component mount
  useEffect(() => {
    console.log("Initializing errored workflows dashboard with time range: 24h");
    
    // Start with 24 hours time range
    setSelectedTimeRange('24h');
    
    // Return cleanup function
    return () => {
      console.log("Dashboard component unmounting");
    };
  }, []);

  // Debug log for time range changes
  useEffect(() => {
    console.log(`Time range changed to: ${selectedTimeRange}`);
  }, [selectedTimeRange]);

  // Add handler for reason for incompletion chart click
  const handleReasonForIncompletionClick = (data) => {
    if (data && data.name) {
      const reason = data.name;
      // If clicking the same reason, toggle it off
      if (selectedReasonForIncompletion === reason) {
        setSelectedReasonForIncompletion(null);
        setReasonFilterFromChart(false);
      } else {
        setSelectedReasonForIncompletion(reason);
        setReasonFilterFromChart(true);
        // Reset to first page when filter changes
        setCurrentPage(1);
      }
    }
  };

  // Reset reason for incompletion filter
  const resetReasonForIncompletionFilter = () => {
    setSelectedReasonForIncompletion(null);
    setReasonFilterFromChart(false);
  };

  if (isLoading) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "64px" }}>
      <p style={{ fontSize: "18px" }}>Loading errored workflow data...</p>
    </div>;
  }

  return (
    <div style={useStyles.main}>
      {/* Add style for notifications and animations */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .spinner {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: 2px solid white;
            border-top-color: transparent;
            animation: spin 1s linear infinite;
          }
          .refresh-progress {
            height: 2px;
            background-color: ${colors.blue};
            transition: width 1s linear;
            position: absolute;
            bottom: 0;
            left: 0;
          }
          @keyframes slideIn {
            from { transform: translateY(-100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes slideOut {
            from { transform: translateY(0); opacity: 1; }
            to { transform: translateY(-100%); opacity: 0; }
          }
          .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
            animation: slideIn 0.3s ease forwards;
          }
          .notification.success {
            background-color: #e6f7e6;
            color: #2e7d32;
            border-left: 4px solid #2e7d32;
          }
          .notification.error {
            background-color: #ffebee;
            color: ${colors.red};
            border-left: 4px solid ${colors.red};
          }
          .notification.exiting {
            animation: slideOut 0.3s ease forwards;
          }
        `}
      </style>
      
      {/* Notification component */}
      {notification && (
        <div 
          className={`notification ${notification.type}`}
          role="alert"
          aria-live="polite"
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>{notification.message}</span>
          <button 
              onClick={() => setNotification(null)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                marginLeft: "10px",
                fontSize: "16px",
                color: notification.type === "success" ? "#2e7d32" : colors.red,
                padding: "0"
              }}
              aria-label="Close notification"
            >
              ×
          </button>
        </div>
          <div style={{ fontSize: "12px", marginTop: "5px", opacity: 0.8 }}>
            {notification.timestamp.toLocaleTimeString()}
      </div>
        </div>
      )}
      
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "15px",
        position: "relative"
      }}>
        <h1 style={useStyles.title}>
          Errored Workflows Dashboard
        </h1>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {/* Time Range Dropdown */}
          <div style={{ 
            position: "relative",
            fontSize: "14px", 
            color: "#666",
            marginRight: "10px"
          }}>
          <select 
              id="timeRange"
              value={selectedTimeRange}
              onChange={(e) => {
                const newTimeRange = e.target.value;
                setSelectedTimeRange(newTimeRange);
                // Reset to first page when changing time range
                setCurrentPage(1);
                
                // Show notification if filters are active
                const hasActiveFilters = selectedWorkflowType || selectedTimePeriod || statusFilter !== "all";
                if (hasActiveFilters) {
                  // Get the new time range label
                  const timeRangeOption = TIME_RANGE_OPTIONS.find(option => option.value === newTimeRange);
                  setNotification({
                    message: `Time range changed to Since ${timeRangeOption.label} while maintaining existing filters`,
                    type: "success",
                    timestamp: new Date()
                  });
                  
                  // Clear notification after 3 seconds
                  setTimeout(() => {
                    setNotification(null);
                  }, 3000);
                }
              }}
              style={{
                padding: "6px 10px",
                paddingLeft: "30px", // Make room for the icon
                paddingRight: "20px", // Make room for the dropdown arrow
                borderRadius: "4px",
                border: "1px solid #ddd",
                backgroundColor: "#f0f7ff",
                color: colors.blue,
                fontWeight: "normal",
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
                cursor: "pointer"
              }}
              aria-label="Select time range"
            >
              {TIME_RANGE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  Since {option.label}
                </option>
            ))}
          </select>
            <AccessTimeIcon style={{ 
              position: "absolute", 
              left: "8px", 
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "18px", 
              color: colors.blue,
              pointerEvents: "none" 
            }} />
            <div style={{ 
              position: "absolute", 
              right: "8px", 
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              color: colors.blue,
              fontSize: "12px"
            }}>▼</div>
        </div>
        
          {/* Live Tail button */}
          <MUITooltip title={autoRefreshEnabled ? "Stop live tailing" : "Start live tailing"}>
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              marginRight: "10px"
            }}>
              <button 
                onClick={() => {
                  const newState = !autoRefreshEnabled;
                  setAutoRefreshEnabled(newState);
                  
                  // If enabling, refresh immediately and reset the timer
                  if (newState) {
                    refreshData();
                    setTimeUntilRefresh(60);
                  }
                  
                  // Show notification when live tail state changes
                  setNotification({
                    message: newState 
                      ? "live tailing started - dashboard will update every 60 seconds" 
                      : "live tailing stopped",
                    type: "success",
                    timestamp: new Date()
                  });
                }}
                disabled={isLoading}
                style={{
                  backgroundColor: autoRefreshEnabled ? colors.blue : "transparent",
                  color: autoRefreshEnabled ? "white" : "#666",
                  border: "1px solid " + (autoRefreshEnabled ? colors.blue : "#ddd"),
                  borderRadius: "4px",
                  padding: "6px 12px",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  opacity: isLoading ? 0.7 : 1
                }}
                aria-label={autoRefreshEnabled ? "Stop live tailing" : "Start live tailing"}
              >
                {autoRefreshEnabled ? (
                  <>
                    <PauseIcon style={{ fontSize: "18px" }} />
                    <span>live tail</span>
                    {!isLoading && <span>({timeUntilRefresh}s)</span>}
                  </>
                ) : (
                  <>
                    <PlayArrowIcon style={{ fontSize: "18px" }} />
                    <span>live tail</span>
                  </>
                )}
                {isLoading && <span className="spinner" style={{ marginLeft: "5px", borderColor: autoRefreshEnabled ? "white" : "#666", borderTopColor: "transparent" }}></span>}
              </button>
        </div>
          </MUITooltip>
          
          {/* Remove PDF download button */}
        </div>
        
        {/* Progress bar for auto-refresh */}
        {autoRefreshEnabled && !isLoading && (
          <div 
            className="refresh-progress" 
            style={{ 
              width: `${(timeUntilRefresh / 60) * 100}%` 
            }}
            aria-hidden="true"
          ></div>
        )}
      </div>

      {/* Summary Cards */}
      {metrics && (
        <div style={useStyles.summaryCardContainer}>
          <div style={{
            ...useStyles.card,
            ...(filteredData && filteredData.length === 0 ? {
              backgroundColor: "#fff8e1", // Light yellow background
              borderLeft: "4px solid #ffc107", // Yellow border
              animation: "flash 1s ease-in-out"
            } : {})
          }}>
            <h3 style={{ color: "#666", fontWeight: "500", marginBottom: "5px" }}>Total Errored Workflows</h3>
            {data && data.totalHits && filteredData && data.totalHits !== filteredData.length ? (
              <>
                <p style={{ 
                  fontSize: "24px", 
                  fontWeight: "bold",
                  color: filteredData.length === 0 ? "#f57c00" : "inherit" // Orange text when no data
                }}>
                  {filteredData.length.toLocaleString()}
                  <span style={{ fontSize: "14px", color: "#666", fontWeight: "normal", marginLeft: "8px" }}>
                    of {data.totalHits.toLocaleString()}
                  </span>
                </p>
                <p style={{ fontSize: "12px", color: "#666" }}>
                  {data.totalHits > 0 ? 
                    `${((filteredData.length / data.totalHits) * 100).toFixed(1)}% of total` : '0%'}
                </p>
                {filteredData.length === 0 && (
                  <p style={{ 
                    fontSize: "14px", 
                    color: "#f57c00", 
                    fontWeight: "500",
                    marginTop: "8px"
                  }}>
                    No errored workflow data found in the selected time range
                  </p>
                )}
              </>
            ) : (
              <>
                <p style={{ 
                  fontSize: "24px", 
                  fontWeight: "bold",
                  color: filteredData.length === 0 ? "#f57c00" : "inherit" // Orange text when no data
                }}>
                  {filteredData ? filteredData.length.toLocaleString() : '0'}
                </p>
                {filteredData.length === 0 && (
                  <p style={{ 
                    fontSize: "14px", 
                    color: "#f57c00", 
                    fontWeight: "500",
                    marginTop: "8px"
                  }}>
                    No errored workflow data found in the selected time range
                  </p>
                )}
              </>
            )}
          </div>
          
          <div style={useStyles.card}>
            <h3 style={{ color: "#666", fontWeight: "500", marginBottom: "5px" }}>Failed</h3>
            <p style={{ fontSize: "24px", fontWeight: "bold", color: colors.red }}>{metrics.failedWorkflows.toLocaleString()}</p>
            {filteredData && filteredData.length > 0 && (
            <p style={{ fontSize: "12px", color: "#666" }}>
                {`${((metrics.failedWorkflows / filteredData.length) * 100).toFixed(1)}%`}
            </p>
            )}
          </div>
          
          <div style={useStyles.card}>
            <h3 style={{ color: "#666", fontWeight: "500", marginBottom: "5px" }}>Terminated</h3>
            <p style={{ fontSize: "24px", fontWeight: "bold", color: colors.purple }}>
              {metrics.terminatedWorkflows.toLocaleString()}
            </p>
            {filteredData && filteredData.length > 0 && (
              <p style={{ fontSize: "12px", color: "#666" }}>
                {`${((metrics.terminatedWorkflows / filteredData.length) * 100).toFixed(1)}%`}
              </p>
            )}
          </div>
          
          <div style={useStyles.card}>
            <h3 style={{ color: "#666", fontWeight: "500", marginBottom: "5px" }}>Timed Out</h3>
            <p style={{ fontSize: "24px", fontWeight: "bold", color: colors.yellow }}>
              {metrics.timedOutWorkflows.toLocaleString()}
            </p>
            {filteredData && filteredData.length > 0 && (
              <p style={{ fontSize: "12px", color: "#666" }}>
                {`${((metrics.timedOutWorkflows / filteredData.length) * 100).toFixed(1)}%`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Charts */}
      <div style={useStyles.gridContainer}>
        {/* Workflow Type Distribution */}
        <div style={useStyles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <h2 style={useStyles.subtitle}>Errored Workflows by Type</h2>
            <div style={{ display: "flex", gap: "10px" }}>
              {/* Workflow Definitions Selector */}
              <WorkflowDefsSelector 
                workflowDefs={uniqueWorkflowDefs}
                selectedDefs={selectedWorkflowDefs}
                setSelectedDefs={setSelectedWorkflowDefs}
                onSelectionChange={() => refreshData()}
              />
              {selectedWorkflowType && (
                <button
                  onClick={resetWorkflowTypeFilter}
                  style={{
                    backgroundColor: colors.blue,
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    padding: "4px 8px",
                    fontSize: "12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px"
                  }}
                  title="Reset workflow type filter"
                >
                  <span>Reset Filter</span>
                  <span style={{ fontSize: "14px" }}>×</span>
                </button>
              )}
            </div>
          </div>
          {selectedWorkflowType && (
            <div style={{ 
              marginBottom: "10px", 
              padding: "6px 10px", 
              backgroundColor: "#f0f7ff", 
              borderRadius: "4px",
              fontSize: "14px"
            }}>
              Filtered by: <strong>{selectedWorkflowType}</strong>
            </div>
          )}
          {workflowDefsError && (
            <div style={{ 
              marginBottom: "10px", 
              padding: "6px 10px", 
              backgroundColor: "#ffebee", 
              borderRadius: "4px",
              fontSize: "14px",
              color: colors.red
            }}>
              Error loading workflow definitions. Chart may not reflect all available workflow types.
            </div>
          )}
          <div style={useStyles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <Pie
                  data={workflowTypeData} 
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={130}
                  label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  onClick={handleWorkflowTypeClick}
                  cursor="pointer"
                >
                  {workflowTypeData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      // Highlight the selected workflow type
                      fillOpacity={entry.name === selectedWorkflowType ? 1 : 0.7}
                      stroke={entry.name === selectedWorkflowType ? "#000" : "none"}
                      strokeWidth={entry.name === selectedWorkflowType ? 2 : 0}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value, name) => {
                    if (name === "count") return [value, "Count"];
                    return [value, name];
                  }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div style={{ 
                          backgroundColor: '#fff', 
                          padding: '10px', 
                          border: '1px solid #ccc',
                          borderRadius: '4px'
                        }}>
                          <p style={{ margin: 0 }}><strong>{new Date(payload[0].payload.time).toLocaleString()}</strong></p>
                          <p style={{ margin: 0 }}>Count: {payload[0].payload.count}</p>
                          <p style={{ margin: 0, fontSize: '11px', color: '#666', marginTop: '5px' }}>
                            Click to filter by this time period
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div style={useStyles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <h2 style={useStyles.subtitle}>Status Distribution</h2>
            {statusFilterFromChart && (
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setStatusFilterFromChart(false);
                }}
                style={{
                  backgroundColor: colors.blue,
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px"
                }}
                title="Reset status filter"
              >
                <span>Reset Filter</span>
                <span style={{ fontSize: "14px" }}>×</span>
              </button>
            )}
          </div>
          <div style={useStyles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  onClick={(data) => {
                    // Set the status filter to the clicked status
                    setStatusFilter(data.name);
                    setStatusFilterFromChart(true);
                    // Reset to first page when filter changes
                    setCurrentPage(1);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {statusData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getStatusColor(entry.name)}
                      // Highlight the selected status with a stroke
                      stroke={entry.name === statusFilter ? "#000" : "none"}
                      strokeWidth={entry.name === statusFilter ? 2 : 0}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value, name) => {
                    if (name === "count") return [value, "Count"];
                    return [value, name];
                  }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div style={{ 
                          backgroundColor: '#fff', 
                          padding: '10px', 
                          border: '1px solid #ccc',
                          borderRadius: '4px'
                        }}>
                          <p style={{ margin: 0 }}><strong>{new Date(payload[0].payload.time).toLocaleString()}</strong></p>
                          <p style={{ margin: 0 }}>Count: {payload[0].payload.count}</p>
                          <p style={{ margin: 0, fontSize: '11px', color: '#666', marginTop: '5px' }}>
                            Click to filter by this time period
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Reason for Incompletion Distribution - Updated Chart with filtering */}
        <div style={useStyles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <h2 style={useStyles.subtitle}>Reason for Incompletion</h2>
            {reasonFilterFromChart && (
              <button
                onClick={resetReasonForIncompletionFilter}
                style={{
                  backgroundColor: colors.blue,
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px"
                }}
                title="Reset reason filter"
              >
                <span>Reset Filter</span>
                <span style={{ fontSize: "14px" }}>×</span>
              </button>
            )}
          </div>
          {selectedReasonForIncompletion && (
            <div style={{ 
              marginBottom: "10px", 
              padding: "6px 10px", 
              backgroundColor: "#f0f7ff", 
              borderRadius: "4px",
              fontSize: "14px"
            }}>
              Filtered by reason: <strong>{selectedReasonForIncompletion}</strong>
            </div>
          )}
          <div style={useStyles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reasonForIncompletionData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({name, percent}) => {
                    // Truncate long reason names for the label
                    const displayName = name.length > 20 ? name.substring(0, 17) + '...' : name;
                    return `${displayName}: ${(percent * 100).toFixed(0)}%`;
                  }}
                  onClick={handleReasonForIncompletionClick}
                  cursor="pointer"
                >
                  {reasonForIncompletionData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      // Highlight the selected reason with a stroke
                      fillOpacity={entry.name === selectedReasonForIncompletion ? 1 : 0.7}
                      stroke={entry.name === selectedReasonForIncompletion ? "#000" : "none"}
                      strokeWidth={entry.name === selectedReasonForIncompletion ? 2 : 0}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value, name) => {
                    if (name === "count") return [value, "Count"];
                    return [value, name];
                  }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div style={{ 
                          backgroundColor: '#fff', 
                          padding: '10px', 
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          maxWidth: '300px'
                        }}>
                          <p style={{ margin: 0, fontWeight: 'bold', marginBottom: '5px' }}>{data.name}</p>
                          <p style={{ margin: 0 }}>Count: {data.value}</p>
                          
                          {/* Show original reasons if this is a fuzzy-matched group */}
                          {data.originalReasons && data.originalReasons.length > 1 && (
                            <div style={{ marginTop: '8px', fontSize: '12px' }}>
                              <p style={{ margin: '0 0 3px 0', fontWeight: 'bold' }}>Includes:</p>
                              <div style={{ 
                                maxHeight: '100px', 
                                overflowY: 'auto', 
                                padding: '3px',
                                border: '1px solid #eee',
                                borderRadius: '3px'
                              }}>
                                {data.originalReasons.slice(0, 10).map((reason, idx) => (
                                  <p key={idx} style={{ margin: '2px 0', wordBreak: 'break-word' }}>
                                    • {reason}
                                  </p>
                                ))}
                                {data.originalReasons.length > 10 && (
                                  <p style={{ margin: '2px 0', fontStyle: 'italic' }}>
                                    ...and {data.originalReasons.length - 10} more
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <p style={{ margin: 0, fontSize: '11px', color: '#666', marginTop: '5px' }}>
                            Click to filter by this reason
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Time Series Analysis */}
        <div style={useStyles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <h2 style={useStyles.subtitle}>Workflow Volume Over Time</h2>
            {selectedTimePeriod && (
              <button
                onClick={resetTimePeriodFilter}
                style={{
                  backgroundColor: colors.blue,
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px"
                }}
                title="Reset time period filter"
              >
                <span>Reset Filter</span>
                <span style={{ fontSize: "14px" }}>×</span>
              </button>
            )}
          </div>
          {selectedTimePeriod && (
            <div style={{ 
              marginBottom: "10px", 
              padding: "6px 10px", 
              backgroundColor: "#f0f7ff", 
              borderRadius: "4px",
              fontSize: "14px"
            }}>
              Filtered by time: <strong>{new Date(selectedTimePeriod).toLocaleString()}</strong>
            </div>
          )}
          <div style={useStyles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={timeseriesData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                onClick={handleTimePeriodClick}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  type="number"
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value, name) => {
                    if (name === "count") return [value, "Count"];
                    return [value, name];
                  }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div style={{ 
                          backgroundColor: '#fff', 
                          padding: '10px', 
                          border: '1px solid #ccc',
                          borderRadius: '4px'
                        }}>
                          <p style={{ margin: 0 }}><strong>{new Date(payload[0].payload.time).toLocaleString()}</strong></p>
                          <p style={{ margin: 0 }}>Count: {payload[0].payload.count}</p>
                          <p style={{ margin: 0, fontSize: '11px', color: '#666', marginTop: '5px' }}>
                            Click to filter by this time period
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke={colors.blue} 
                  name="Workflow Count" 
                  activeDot={{ 
                    r: 8,
                    stroke: (entry) => entry.time === selectedTimePeriod ? "#000" : colors.blue,
                    strokeWidth: (entry) => entry.time === selectedTimePeriod ? 2 : 0,
                    fill: (entry) => entry.time === selectedTimePeriod ? "#fff" : colors.blue
                  }}
                  dot={{ 
                    r: 4,
                    stroke: (entry) => entry.time === selectedTimePeriod ? "#000" : "none",
                    strokeWidth: (entry) => entry.time === selectedTimePeriod ? 2 : 0
                  }}
                  style={{ cursor: 'pointer' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Results Table using imported component */}
      <div style={{...useStyles.card, marginTop: "20px"}}>
        <h2 style={useStyles.subtitle}>Errored Workflow Details</h2>
        
          {filteredData && filteredData.length > 0 ? (
          <ResultsTable 
            resultObj={{ results: filteredData, totalHits: filteredData.length }}
            error={null}
            busy={isLoading}
            page={currentPage}
            rowsPerPage={rowsPerPage}
            sort={`${sortField}:${sortDirection.toUpperCase()}`}
            setPage={setCurrentPage}
            setRowsPerPage={setRowsPerPage}
            setSort={(field, direction) => {
              setSortField(field);
              setSortDirection(direction === 'ASC' ? 'asc' : 'desc');
            }}
            showMore={false}
          />
          ) : (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              color: '#666',
              backgroundColor: '#f9f9f9',
              borderRadius: '4px'
            }}>
              No errored workflow data available
            </div>
          )}
        </div>
      </div>
  );
};

// Workflow Definitions Selector Component
const WorkflowDefsSelector = ({ workflowDefs, selectedDefs, setSelectedDefs, onSelectionChange }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [tempSelectedDefs, setTempSelectedDefs] = useState([]);

  // Create a unique list of workflow definition names
  const uniqueWorkflowDefs = useMemo(() => {
    if (!Array.isArray(workflowDefs)) return [];
    
    // Use a Set to get unique workflow names
    const uniqueNames = new Set();
    const uniqueDefs = [];
    
    workflowDefs.forEach(def => {
      if (!uniqueNames.has(def.name)) {
        uniqueNames.add(def.name);
        uniqueDefs.push(def);
      }
    });
    
    return uniqueDefs;
  }, [workflowDefs]);

  const handleClick = (event) => {
    // Initialize temporary selections with current selections when opening the menu
    setTempSelectedDefs([...selectedDefs]);
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    // Apply the temporary selections when closing the menu
    setSelectedDefs(tempSelectedDefs);
    
    // Trigger refresh when menu is closed if selections changed
    if (JSON.stringify(tempSelectedDefs) !== JSON.stringify(selectedDefs)) {
      if (onSelectionChange) {
        onSelectionChange(tempSelectedDefs);
      }
    }
    
    setAnchorEl(null);
  };

  const handleChange = (defName, checked) => {
    let newTempSelectedDefs;
    if (checked) {
      newTempSelectedDefs = [...tempSelectedDefs, defName];
    } else {
      newTempSelectedDefs = tempSelectedDefs.filter(def => def !== defName);
    }
    setTempSelectedDefs(newTempSelectedDefs);
  };

  const resetToDefaults = () => {
    if (uniqueWorkflowDefs && uniqueWorkflowDefs.length > 0) {
      const allDefs = uniqueWorkflowDefs.map(def => def.name);
      // Update both temporary and actual selections
      setTempSelectedDefs(allDefs);
      setSelectedDefs(allDefs);
      
      // Trigger refresh if selection changed
      if (JSON.stringify(allDefs) !== JSON.stringify(selectedDefs)) {
        if (onSelectionChange) {
          onSelectionChange(allDefs);
        }
      }
    }
    setAnchorEl(null); // Close the menu
  };

  // Calculate if all workflow definitions are selected
  const allSelected = uniqueWorkflowDefs && uniqueWorkflowDefs.length > 0 && 
    uniqueWorkflowDefs.every(def => selectedDefs.includes(def.name));

  return (
    <>
      <MUITooltip title="Select Workflow Types">
        <IconButton 
          onClick={handleClick} 
          aria-label="Select Workflow Types"
          color={!allSelected && selectedDefs.length > 0 ? "primary" : "default"}
          style={{ padding: "4px" }}
        >
          <ViewColumnIcon />
        </IconButton>
      </MUITooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        getContentAnchorEl={null}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          style: { 
            maxHeight: 300,
            width: 250
          }
        }}
      >
        {uniqueWorkflowDefs && uniqueWorkflowDefs.length > 0 ? (
          <div>
            {uniqueWorkflowDefs.map(def => (
              <MenuItem key={def.name} value={def.name} dense>
                <Checkbox
                  checked={tempSelectedDefs.includes(def.name)}
                  onChange={(e) => handleChange(def.name, e.target.checked)}
                  color="primary"
                />
                <ListItemText primary={def.name} />
              </MenuItem>
            ))}
            <MenuItem key="_divider" divider style={{ margin: '8px 0' }} />
            <MenuItem key="_reset" onClick={resetToDefaults}>
              <ListItemText primary="Reset to defaults" style={{ color: '#1f83db', fontWeight: 'bold' }} />
            </MenuItem>
    </div>
        ) : (
          <MenuItem disabled>
            <ListItemText primary="Loading workflow definitions..." />
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export default ErrorsInspector;