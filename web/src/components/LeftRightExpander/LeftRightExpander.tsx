import React, { useEffect, useState } from "react";
import classNames from "classnames";
import Checkbox from "../Checkbox";
import { Down, Right } from "@icon-park/react";

import "./LeftRightExpander.less";

export interface LeftRgithExpanderProps {
	className?: string;
	style?: React.CSSProperties;
	children: any;
	title?: string;
	expanded?: boolean;
	showCheckbox?: boolean;
	checked?: boolean;
	onChange?: (expanded: boolean) => void;
	onChecked?: (checked: boolean) => void;
}

export default function (props: LeftRgithExpanderProps) {
	let { className, style, title = "Title" } = props;
	const [expanded, setExpanded] = useState(!!props.expanded);
	const [checked, setChecked] = useState(!!props.checked);
	let { showCheckbox = true } = props;

	useEffect(() => {
		setChecked(!!props.checked);
	}, [props.checked]);

	function renderArrowIcon() {
		if (expanded) {
			return (
				<Down
					theme="outline"
					size="20"
					fill="#757272"
					strokeWidth={3}
					strokeLinejoin="miter"
					strokeLinecap="square"
					style={{
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
					}}
				/>
			);
		} else {
			return (
				<Right
					theme="outline"
					size="20"
					fill="#757272"
					strokeWidth={2}
					strokeLinejoin="miter"
					strokeLinecap="square"
					style={{
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						marginTop: -1,
					}}
				/>
			);
		}
	}

	function renderPopupview() {
		if (expanded) {
			return (
				<div className="solid-expander__popupview">
					<div className="solid-expander__popupview">{props.children}</div>
				</div>
			);
		}
	}

	function handleClick() {
		setExpanded(!expanded);

		if (props.onChange) {
			props.onChange(!expanded);
		}
	}

	let _className = classNames("solid-expander", className, {
		"solid-expander--expanded": expanded,
	});

	return (
		// <div className="solid-expander">
		<div className={_className} style={style}>
			<div
				className="solid-expander__node left-right-nodes clearfix cursor-pointer"
				onClick={handleClick}
			>
				<div className="flex-horizontal-layout v-middle h-left left-node">
					<div className="flex-center-adapt-layout node-btn">
						{renderArrowIcon()}
					</div>
					<div className="node-text">{title}</div>
				</div>
				{showCheckbox ? (
					<div className="flex-horizontal-layout v-middle h-right right-node">
						<div className="node-text"></div>
						<Checkbox
							checked={checked}
							onChange={(checked) => {
								setChecked(checked);
								props.onChecked && props.onChecked(checked);
							}}
							style={{
								marginLeft: 8,
								marginRight: 5,
							}}
						/>
					</div>
				) : undefined}
			</div>
			{renderPopupview()}
		</div>
	);
}