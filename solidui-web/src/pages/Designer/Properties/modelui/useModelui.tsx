/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useEffect, useState } from "react";
import { message } from "antd";
import { useMemoizedFn } from "ahooks";
import { eventbus, mm } from "@/utils";
import Apis from "@/apis";
import { ApiResult, DataSourceDataType, DataSourceTypeDataType } from "@/types";
import { WaitingStates, MessageDict } from "@/types/chat";
import { find, isNil, cloneDeep } from "lodash-es";

interface Option {
	key: string;
	value: string | number | null;
	label: React.ReactNode;
	children: Option[];
	isLeaf: boolean;
	loading?: boolean;
}

function useModelui() {
	const [models, setModels] = useState<
		Array<{ key: string; label: string; value: any }>
	>([]);
	const [promptInput, setPromptInput] = useState<string>("");
	const [messages, setMessages] = useState<Array<MessageDict>>(
		Array.from([
			// {
			// 	text: "Hello! I'm a GPT Code assistant. Ask me to do something for you! Pro tip: you can upload a file and I'll be able to use it.",
			// 	role: "system",
			// 	type: "message",
			// },
		]),
	);
	const [waitingForSystem, setWaitingForSystem] = useState<WaitingStates>(
		WaitingStates.Idle,
	);

	const selectedModelIdRef = React.useRef<number>();
	const promptContentRef = React.useRef<string>();
	const dbContentRef = React.useRef<string>();

	const [modalOpen, setModalOpen] = useState<boolean>(false);
	const [loading, setLoading] = useState<boolean>(false);
	const [dataSources, setDataSources] = useState<DataSourceDataType[]>([]);
	const [dataSourceOptions, setDataSourceOptions] = useState<Option[]>([]);
	const [selectedDataSourceOptions, setSelectedDataSourceOptions] = useState<
		string[]
	>([]);
	const [dataSourceTypes, setDataSourceTypes] = useState<
		DataSourceTypeDataType[]
	>([]);
	const dsTypeIdRef = React.useRef<string>();
	const [selectedDataSource, setSelectedDataSource] = useState<{
		dataSourceName: string;
		typeName: string;
	}>();
	const [databaseInput, setDatabaseInput] = useState<string>("");
	const [columns, setColumns] = useState<string[]>([]);
	const [rows, setRows] = useState<any[][]>([]);

	const loadModels = useMemoizedFn(async () => {
		const res: ApiResult<Array<{ label: string; value: any }>> =
			await Apis.modelui.keys();
		if (res.ok) {
			const datas = res.data || [];
			const mModels = datas.map((model: any) => ({
				key: model.id,
				label: model.name,
				value: model.id,
			}));
			if (mModels[0] && mModels[0].value) {
				selectedModelIdRef.current = mModels[0].value;
			}
			addMessage({
				text: `Hello! I'm a ${
					mModels[0].label || "GPT"
				} Code assistant. Ask me to do something for you! Pro tip: you can upload a file and I'll be able to use it.`,
				role: "system",
				type: "message",
			});
			setModels(mModels);
		}
	});

	const getApiData = useMemoizedFn(async () => {
		if (document.hidden) {
			return;
		}

		const response = await fetch(`/solidui/models/api/api`);
		const data = await response.json();
		if (data.code === 200) {
			const resultData = data.data || "{}";
			const resultJo = JSON.parse(resultData);
			const results = resultJo.results || [];
			results.forEach((result: { value: string; type: string }) => {
				if (result.value.trim().length === 0) {
					return;
				}
				/// / handle result, trigger draw event
				if (result.type === "image/png" || result.type === "image/jpeg") {
					eventbus.emit("onDraw", {
						viewType: "image_base64",
						options: {
							imageType: result.type,
							imageData: result.value,
						},
					});
				}
				addMessage({ text: result.value, type: result.type, role: "system" });
				setWaitingForSystem(WaitingStates.Idle);
			});
		}
	});

	useEffect(() => {
		loadModels();
		const interval = setInterval(getApiData, 2500);
		return () => clearInterval(interval);
	}, [loadModels, getApiData]);

	async function handleRestart() {
		addMessage({
			text: "Restarting the kernel.",
			type: "message",
			role: "system",
		});

		await Apis.modelui.kernel_restart();
	}

	async function sendMessage() {
		const prompt = promptContentRef.current || "";
		const modelId = selectedModelIdRef.current;
		try {
			if (prompt.length === 0 || isNil(modelId)) {
				return;
			}

			if (prompt.trim().toLowerCase() === "restart") {
				handleRestart();
				return;
			}

			addMessage({ text: prompt, type: "message", role: "user" });
			setWaitingForSystem(WaitingStates.GeneratingCode);
			promptContentRef.current = "";
			setPromptInput("");

			const res: ApiResult<any> = await Apis.modelui.generate({
				modelId,
				prompt: `"${prompt}"`,
			});
			if (res.ok) {
				const data = res.data || {};
				const code = data.code || "";
				addMessage({ text: code, type: "code", role: "system" });
				submitCode(code);
				setWaitingForSystem(WaitingStates.RunningCode);
			} else {
				setWaitingForSystem(WaitingStates.Idle);
			}
		} catch (error) {
			// console.error(
			// 	"There has been a problem with your fetch operation:",
			// 	error,
			// );
		}
	}

	async function submitCode(code: string) {
		const commandRes: ApiResult<string> = await Apis.modelui.generateByCommand({
			command: code,
		});
		if (commandRes.ok) {
			const resultMsgStr = commandRes.data || "{}";
			const resultMsgObj = JSON.parse(resultMsgStr);
			const resultMsg = resultMsgObj.result || "";
			if (resultMsg === "success") {
				message.info("code run success");
			}
		}
	}

	function handleModelChange(value: any) {
		selectedModelIdRef.current = value;

		const mModels = models.filter((model) => model.value === value);

		if (mModels !== null && mModels !== undefined) {
			addMessage({
				text: `Hello! I'm a ${
					mModels[0].label || "GPT"
				} Code assistant. Ask me to do something for you! Pro tip: you can upload a file and I'll be able to use it.`,
				role: "system",
				type: "message",
			});
		}
	}

	function handlePromptInputChange(value: string) {
		promptContentRef.current = value || "";
		setPromptInput(value || "");
	}

	function addMessage(message: MessageDict) {
		setMessages((state: any) => [...state, message]);
	}

	async function toggleModal(open: boolean) {
		console.log(open === true)
		if (open === true) {
			handleLoad()
		}
		setModalOpen(open);
	}

	function handleDatabaseSave () {

	}

	function handleDBInputInputChange(value: string) {
		dbContentRef.current = value || "";
		setPromptInput(value || "");
	}

	const handleLoad = useMemoizedFn(async () => {
		setLoading(true);

		const res: ApiResult<DataSourceTypeDataType[]> =
			await Apis.datasource.types();
		if (res.ok) {
			const mDataSourceTypes = res.data || [];
			const res2: ApiResult<DataSourceDataType> = await Apis.datasource.query({
				pageNo: 1,
				pageSize: 10000,
				expire: false,
				name: "",
			});
			if (res2.ok) {
				const data = res2.data || ({} as any);
				const records: DataSourceDataType[] = data.totalList || [];
				const mDataSourceOptions: Option[] = [];
				records.forEach((item: any) => {
					// item.key = item.id;
					mDataSourceOptions.push({
						key: `${item.id}`,
						label: item.dataSourceName,
						value: item.id,
						isLeaf: false,
						children: [],
					});
				});

				setDataSourceOptions(mDataSourceOptions);
				setDataSourceTypes(mDataSourceTypes);
				setDataSources(records || []);
				setColumns([]);
				setRows([]);
				
			}
		}
		setLoading(false);
	});

	async function queryTables(id: string) {
		const target = find(dataSources, (d) => d.id === id);
		if (target === null || undefined === target) {
			return;
		}
		const dsType = find(
			dataSourceTypes,
			(d) => d.id === `${target?.dataSourceTypeId}`,
		);
		if (dsType === null || undefined === dsType) {
			return;
		}
		dsTypeIdRef.current = `${target?.dataSourceTypeId}`;
		const res: ApiResult<any> = await Apis.datasource.dbs({
			dataSourceName: target.dataSourceName,
			typeName: dsType.classifier,
		});
		if (res.ok) {
			const data = res.data || ({} as any);
			const records = data || [];
			const dsOptions = cloneDeep(dataSourceOptions);
			const targetDsOption = find(dsOptions, (ds) => ds.value === id);
			records.forEach((item: any) => {
				targetDsOption?.children.push({
					key: item,
					label: item,
					value: item,
					isLeaf: true,
					children: [],
				});
			});

			/// / dataSourceId
			const currentView = mm.getCurrentView();
			if (!isNil(currentView)) {
				currentView.data.dataSourceId = id;
				currentView.data.dataSourceName = target.dataSourceName;
				currentView.data.dataSourceTypeId = dsTypeIdRef.current;
				currentView.data.dataSourceTypeName = dsType.name;
			}

			setDataSourceOptions(dsOptions);
			setSelectedDataSource({
				dataSourceName: target.dataSourceName,
				typeName: dsType.classifier,
			});
		}
	}

	// TODO type
	async function changeDsSelections(value: any[], selectOptions: any[]) {
		setSelectedDataSourceOptions(value);
		const currentView = mm.getCurrentView();
		if (
			selectOptions !== null &&
			undefined !== selectOptions &&
			selectOptions.length === 2 &&
			!isNil(currentView)
		) {
			const val = selectOptions[1].value;
			currentView.data.table = val;
		}
	}

	return {
		models,
		messages,
		promptInput,
		waitingForSystem,
		modalOpen,
		loading,
		dataSourceOptions,
		selectedDataSourceOptions,
		databaseInput,
		handleModelChange,
		handlePromptInputChange,
		sendMessage,
		setModalOpen,
		toggleModal,
		handleDatabaseSave,
		queryTables,
		changeDsSelections,
		handleDBInputInputChange
	};
}

export default useModelui;
