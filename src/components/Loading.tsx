const Loading = () => (
	<div className='flex justify-center gap-1.5 pt-20' role='status' aria-label='Loading'>
		{[0, 1, 2].map((i) => (
			<span
				key={i}
				className='w-2 h-2 rounded-full bg-stone-300 animate-bounce'
				style={{animationDelay: `${i * 130}ms`}}
			/>
		))}
	</div>
);

export default Loading;
